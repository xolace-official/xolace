# Companion talks: can Convex be the brain behind a live talk

**Status:** Research note for [#578](https://github.com/xolace-official/xolace_app/issues/578) (map [#576](https://github.com/xolace-official/xolace_app/issues/576)). No code changed. Written 2026-10-19.

**Short answer: yes, with one shape constraint.** A Convex `httpAction` can be ElevenLabs Agents' custom LLM: it can stream an OpenAI-style chat-completions SSE response, and nothing in Convex's published limits gets in the way. The voice-turn budget is tight (about **300–450 ms** for our server to emit its first token), so on each turn only work that runs **at the same time as** the model call fits: OpenAI moderation, and a memory read prepared before the talk starts. The Haiku classifier half of our safeguard and a fresh episodic vector search do **not** fit before the first word. They run alongside the turn or asynchronously, and their results apply from the next turn on. The finished transcript enters the existing pipeline through `internal.ai.process.generateMirror`, but it needs a new internal entry point. `submitInput` can't be reused as is: it needs Clerk auth and caps input at 5,000 characters.

"Unverified" marks anything I could not confirm against a primary source.

---

## 1. Our current shapes (what a talk has to plug into)

- **One reflection today** (`convex/ai/process.ts` `generateMirror`, args `{ sessionId, rawText }`): `buildSessionContext` (one query) → rate limit → **in parallel**: OpenAI moderation (`omni-moderation-latest`, via `moderationCache`), Haiku 5.5 classifier (`claude-haiku-5-5`, via `classifierCache`), episodic search (`searchEpisodicMemory`: `rag.search` with OpenAI `text-embedding-3-small`, top 4, keep 3) → `evaluateSafeguard` (pure rules) → `decideMirrorOutcome` (pure) → Sonnet 5.5 articulator (`claude-sonnet-5-5`, `max_tokens: 300`, non-streaming).
- **The safeguard needs both inputs.** `evaluateSafeguard(classification, moderation, recentMetadata)` (`convex/ai/safeguard.ts`): `checkRejection` uses moderation flags; `checkCrisis` uses the moderation score `self-harm/intent > 0.7` **or** classifier signals; `checkElevated` and `checkGentle` mix the two. So "moderation only" is a strict subset of today's safeguard, not the whole of it. Moderation **fails open** (`MODERATION_UNAVAILABLE` is unflagged).
- **Memory already in context:** `buildSessionContext` (`convex/ai/context.ts`) returns `semanticProfile` (rendered whole, never vector-searched), `recentMetadata`, `recentSessions`, `preferences`, and `isPremium`. Only episodic recall needs an embedding round-trip.
- **Session entry:** `sessions.initiate` (public, Clerk-authed, rate-limited, takes `entryType`) → `sessions.submitInput` (public, `requireSessionOwnership`, `MAX_RAW_INPUT = 5_000` chars, patches the session to `processing`, schedules `generateMirror`). `entryType` is a closed union (`open_prompt | guided_entry | body_scan | word_cloud | voice`) in both `convex/schema.ts` and `convex/lib/validators.ts`.
- **Installed components:** `rag`, `workflow`, `rate-limiter`, `action-cache`, `presence`, and others. **No** `@convex-dev/agent` and no `ai` package. The repo is on `convex` 1.45.0; `@ai-sdk/openai` 3.0.80 is used only for embeddings.

## 2. ElevenLabs custom LLM contract

From [Integrate your own model](https://elevenlabs.io/docs/agents-platform/customization/llm/custom-llm):

- **Endpoint:** ElevenLabs calls `POST {your base URL}/v1/chat/completions` (OpenAI Chat Completions shape). It also accepts the Responses shape at `/v1/responses`.
- **Request:** `messages` (the system prompt is the first message, role `system`; **ElevenLabs resends the whole history every turn**), `model`, `temperature`, `max_tokens`, `stream`, `tools` (OpenAI function format, when system tools such as `end_call` and `skip_turn` are enabled), and `elevenlabs_extra_body` (custom params passed at conversation start).
- **Response:** `Content-Type: text/event-stream`, chunks `data: {json}\n\n` in OpenAI `chat.completion.chunk` form, and must end with `data: [DONE]\n\n`. On error, send an error payload in the stream rather than closing it.
- **Buffer words:** a slow LLM can send a first chunk ending in `"... "` (the trailing space matters) so TTS starts talking while the real answer is generated.
- **Failure handling** ([LLM cascading](https://elevenlabs.io/docs/agents-platform/customization/llm/llm-cascading)): with a custom LLM there is **no fallback** to ElevenLabs-hosted models. A failure (error, timeout, empty response) is retried against the same endpoint. A configurable "soft timeout" can play a filler message while the LLM is slow (default off).
- **Auth to our server:** the dashboard stores an "API key" secret for the custom LLM. A third-party guide says it arrives as `Authorization: Bearer <secret>` ([inference.net](https://docs.inference.net/integrations/agent-platforms/elevenlabs)). **Unverified** against ElevenLabs' own docs. Either way it is a shared server secret: it proves the request comes from our agent, not **which person** it is for (see §6).
- **Not specified by ElevenLabs:** the custom-LLM request timeout. **Unverified.**

## 3. Can a Convex `httpAction` serve it?

**Yes.**

- HTTP actions support streamed responses (`ReadableStream`), served from `https://<deployment>.convex.site` ([HTTP actions](https://docs.convex.dev/functions/http-actions)). Response streaming shipped in Convex 1.12 for exactly this LLM use ([changelog](https://ship.convex.dev/changelog/announcing-convex-1-12); worked example: [AI chat with HTTP streaming](https://stack.convex.dev/ai-chat-with-http-streaming)).
- Limits ([Limits](https://docs.convex.dev/production/state/limits)): response size 100 MiB, 64 MiB of memory per HTTP action, and concurrency of 64 for Convex-runtime and HTTP actions on the S16 plan (512 on S256). One talk turn is a few KB of text, so size is irrelevant. Concurrency caps simultaneous turns being *generated*, not open talks; 64 is plenty at launch. **No HTTP-action execution timeout is published** (plain actions: 30 min Convex runtime / 10 min Node). **Unverified**, but a voice turn lasts seconds.
- An HTTP action runs in the Convex (V8) runtime, so the `@anthropic-ai/sdk` we already use can stream with `client.messages.stream(...)`. The handler maps each Anthropic `content_block_delta` text delta to a `chat.completion.chunk` `{choices:[{delta:{content}}]}` line and ends with `[DONE]`. That translation is about 30 lines and the only glue needed. It can call `ctx.runQuery` / `ctx.runMutation` for context and logging.
- **Unverified and must be measured:** the network hop ElevenLabs → `*.convex.site` (where our deployment's region sits relative to ElevenLabs' servers), and HTTP-action start-up time. Neither is published.

## 4. Convex Agent component: does it fit the voice loop?

**Not for the voice hot path.** ([Agents overview](https://docs.convex.dev/agents), [Streaming](https://docs.convex.dev/agents/streaming), [Context](https://docs.convex.dev/agents/context), [Messages](https://docs.convex.dev/agents/messages), [repo](https://github.com/get-convex/agent).)

What it offers: persistent **threads** and **messages**; automatic context (`contextOptions`: `recentMessages` default 100, optional text/vector `searchOptions`, `searchOtherThreads`); a `contextHandler` that can inject memories or a profile; tools; usage tracking; rate limiting. Streaming either saves deltas to the DB for websocket clients (`saveStreamDeltas`, throttled) or, over HTTP, uses `toUIMessageStreamResponse()` / `toTextStreamResponse()`, optionally with `saveStreamDeltas: { returnImmediately: true }`.

Why it is the wrong fit here:

1. **ElevenLabs already owns the turn history.** It resends the full `messages` array every turn, so the Agent's thread memory duplicates it, and keeping the two in sync is work with no payoff.
2. **Wrong wire format.** Its HTTP output is the AI SDK UI-message or text stream, not OpenAI `chat.completion.chunk` SSE, so we would still write the translation layer from §3.
3. **Extra writes on the hot path.** Saving the prompt and output messages (and embeddings, unless skipped) are mutations around generation that a voice turn doesn't need.
4. **Dependency jump.** `@convex-dev/agent` 0.7.8 peer-requires `ai@^7`, `@ai-sdk/provider@^4` and `convex@^1.46.0` (`npm view`, 2026-10-19). We are on `convex` 1.45.0 with no `ai` package, and it pulls Claude calls through the AI SDK instead of our `@anthropic-ai/sdk` provider module.
5. **Constitution fit.** All model calls must live under `convex/ai/` with our own providers. A thin `httpAction` that calls a function in `convex/ai/companion/` keeps that intact.

Where it *could* earn a place later: the **text fallback** inside a talk (websocket delta streaming to the app). But the text fallback can call the same `convex/ai/` turn function and stream through the existing reactive-query pattern, so I'd skip it unless that path grows tools and long threads.

## 5. One voice turn: the latency budget

ElevenLabs' own target is **end-to-end time to first audio under 700 ms**. Above 700 ms an agent "may feel unnatural", and agents over 1,200 ms see "high abandonment rates" ([ElevenLabs, optimizing latency](https://elevenlabs.io/blog/how-do-you-optimize-latency-for-conversational-ai)).

| Stage | Estimate | Source |
|---|---|---|
| End-of-speech detection (VAD silence threshold) | not published | ElevenLabs blog (qualitative only). **Unverified** |
| ASR finalize (Scribe v2 Realtime) | ~150 ms | ElevenLabs blog |
| ElevenLabs → Convex → ElevenLabs network + HTTP action start | ~50–150 ms | **Unverified estimate**; measure |
| **Our server to first token** (context + model TTFT) | **what's left: ~300–450 ms for the 700 ms target, ~800 ms for the 1,200 ms ceiling** | derived |
| TTS first audio (Flash v2.5) | ~75 ms model; ~255 ms median incl. network (third-party) | ElevenLabs blog; [Deepgram](https://deepgram.com/learn/is-elevenlabs-real-time-what-developers-need-to-know) |

Model choice: Anthropic ranks Haiku 5.5 "Fastest" and Sonnet 5.5 "Fast" in comparative latency, and recommends Haiku 5.5 at `effort: "low"` plus streaming for speed-critical work ([Models overview](https://platform.claude.com/docs/en/about-claude/models/overview), [Reducing latency](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-latency)). **Anthropic publishes no TTFT numbers.** Whether Sonnet 5.5 (thinking off via `{ type: "between_tools" }`) fits the ~400 ms window, or only Haiku 5.5 does, is **unverified** and the first thing a prototype should measure. Prompt caching of the stable prefix (system prompt plus per-talk memory block) lowers TTFT on every turn after the first, and a `max_tokens: 0` pre-warm at talk start removes the cold first turn (claude-api skill, `shared/prompt-caching.md`). Buffer words (§2) are the fallback if Sonnet's TTFT runs long.

### Does a per-turn safeguard fit?

- **OpenAI moderation: yes, in parallel, never in series.** No first-party latency figure exists. OpenAI labels the model "medium" speed. A Portkey benchmark found omni and legacy moderation "within a few milliseconds" of each other but published no absolute numbers ([Portkey](https://portkey.ai/blog/openai-omni-moderation-latest-benchmark/), [OpenAI model page](https://developers.openai.com/api/docs/models/omni-moderation-latest)). Absolute latency is **unverified**; measure it. Pattern: start moderation on the latest user message **at the same moment** as the model stream, and **hold the first outgoing chunk until moderation returns** (or a short cap, e.g. 250 ms). The added latency is then `max(moderation, TTFT) − TTFT`, which is likely zero. If moderation trips `checkRejection` or the `self-harm/intent > 0.7` crisis rule, drop the generated text and stream a fixed safe reply instead (crisis resources, plus a client signal through a reactive query so the app shows the resource card).
- **The classifier half: no, not before the first word.** It is a full non-streaming Haiku call. Run it per turn **asynchronously** (schedule it after the turn), write the turn's safeguard level to the talk record, and have the next turn's handler read it. An `elevated` or `crisis` verdict then changes the companion's instructions from the next turn, and the app (subscribed to the talk) can show resources immediately. The end-of-talk pipeline still runs the full safeguard over the whole transcript, so nothing escapes the final verdict. Rule 5 ("anything new that touches user input must pass the same safeguard") is met at talk level. Per turn it is met with a lag of one turn for classifier-only signals. **The team should accept that lag explicitly.**

### Does a memory lookup fit?

- **Semantic profile + recent Understandings: yes, but load them once at talk start, not per turn.** It's one query (`buildSessionContext`-style). Put it in the cached system prefix. Per-turn cost: zero.
- **Episodic search: not inline.** It needs an OpenAI embedding call plus a vector search (rough guess 150–400 ms, **unverified**). Run it **in parallel** with each turn against the person's latest words, and inject the matches into the **next** turn. An alternative is a tool the model calls when it wants a memory, but that costs a full extra model round-trip and is worse for voice. Seed turn 1 with an episodic search over the talk's opening context at talk start.

## 6. Who is the person? (identity on the hot path)

The ElevenLabs request carries no Clerk JWT. Suggested shape: the app calls a Clerk-authed mutation `startTalk` that creates the session (`initiate` path, Plus gate, usage cap) and a talk row with an unguessable **talk token**. The app passes that token when it starts the ElevenLabs conversation (as `custom_llm_extra_body` / dynamic variables, which the post-call payload also echoes under `conversation_initiation_client_data`). The HTTP action checks the shared bearer secret, then resolves `elevenlabs_extra_body.talkToken` to the talk row, and with it the profile and context. **Unverified:** that `elevenlabs_extra_body` arrives on *every* turn request, not only the first. The docs' example request shows it, but this needs a test call.

## 7. How the finished talk enters the session pipeline

**Source of the transcript.** Use ElevenLabs' `post_call_transcription` webhook ([post-call webhooks](https://elevenlabs.io/docs/agents-platform/workflows/post-call-webhooks)) to a new `httpAction` route (e.g. `/webhooks/elevenlabs` in `convex/http.ts`). Verify the `ElevenLabs-Signature` HMAC (their SDK's `constructEvent`, or hand-rolled in the Convex runtime) and deduplicate by `conversation_id` (deliveries retry). The payload's `data.transcript[]` holds `{ role, message, time_in_call_secs, ... }`, and `data.metadata.call_duration_secs` gives the length. Since our own HTTP action sees every turn, it can also log turns as they happen as a fallback if the webhook is late or disabled (ElevenLabs auto-disables a webhook after 10+ consecutive failures).

**Entry point and reshaping:**

1. **New internal mutation** (e.g. `internal.talks.submitTranscript`) that does what `submitInput` does: patch the session to `processing`, set `rawInput` / `rawInputLength` / `inputDuration` / `timeOfDay` / `dayOfWeek`, then `ctx.scheduler.runAfter(0, internal.ai.process.generateMirror, { sessionId, rawText })`. It can't call `submitInput` itself, because that is public and calls `requireSessionOwnership`, and the webhook has no user identity.
2. **`entryType`:** add a `"talk"` literal to the union in `convex/schema.ts` and `convex/lib/validators.ts`. Widening the union is safe under the store-gap rule. Otherwise reuse `"voice"`, but that loses the distinction the classifier and articulator prompts may want.
3. **`rawText` shape.** The classifier and articulator prompts assume `rawText` is the person's own words. A raw transcript mixes in the companion's lines, which the models would read as the person's. Options: (a) `rawText` = the person's turns only, joined in order. This is the smallest change and keeps every prompt valid. (b) A labelled `Person:` / `Companion:` transcript with prompt changes. Recommendation: (a) for the mirror, with the full transcript stored separately (where and for how long is the open "Talk transcripts" item on the map).
4. **Length cap.** `MAX_RAW_INPUT` is 5,000 characters. At ~130–150 spoken words per minute, a 10-minute talk is ~6–9k characters of the person's words alone. The talk path needs its own cap (tied to the talk's hard ceiling) or a server-side trim. The articulator's 300-token output and the classifier prompt are untested on inputs this long. **Unverified quality risk; eval before launch.**
5. **Other fields:** `inputDuration = call_duration_secs * 1000`, `freezeOccurred: false`. Everything downstream (Understanding row, distiller, RAG ingest, Kindling, follow-ups) runs unchanged because it keys off `sessionId`.
6. **Watch-outs:** `generateMirror` applies the `aiMirrorRequest` rate limit, so a talk consumes a reflection. `checkAbandoned` marks `initiated` sessions older than 30 minutes as abandoned, so a talk ceiling over 30 minutes needs the session kept fresh or a talk-specific state. "Say more reopens the talk" means the refinement path (`sessionTurns` → `clarify.handleClarification`, `buildAccumulatedInput`) must accept a second transcript segment. That's out of scope here, but it is the same reshaping again.

## 8. Recommendation

Build the companion's turn as a **plain Convex `httpAction`** (OpenAI-compatible SSE) that calls a turn function in `convex/ai/companion/` streaming from `@anthropic-ai/sdk`. Skip the Agent component. Per turn: cached prefix with memory loaded at talk start, **moderation raced against TTFT and gating the first chunk**, classifier safeguard and episodic recall **asynchronously, applied from the next turn**. At the end: the webhook feeds the person's lines into `generateMirror` through a new internal mutation and a `"talk"` entry type.

**Measure in a prototype before locking the spec:** (1) Haiku 5.5 vs Sonnet 5.5 TTFT with our prompt size; (2) ElevenLabs ↔ `convex.site` round-trip; (3) omni-moderation p50/p95; (4) episodic search p50/p95; (5) whether `elevenlabs_extra_body` arrives on every turn; (6) mirror quality on 5k+ character talk inputs.
