# Companion talks: what ElevenLabs gives us for a real-time voice talk

**Status:** Research note for #577 (map #576). Read against ElevenLabs' official docs on 2026-10-19. Nothing here is built.
Claims marked **[unverified]** could not be confirmed from a primary source. Claims marked **[inferred]** are my reading of two documented facts together.

## TL;DR

- **Recommendation: hosted ElevenAgents, with a Custom LLM pointed at a Convex HTTP action under `convex/ai/`.** ElevenLabs runs speech-to-text, turn-taking, text-to-speech and the mobile transport. Our endpoint is the brain: every turn it runs the safeguard, reads memory, and streams Claude's reply. We turn off ElevenLabs' own LLM, knowledge base and webhook tools. This needs no new infrastructure, because Convex can serve the streaming endpoint. The Speech Engine would need a persistent WebSocket server, and Convex cannot host one.
- **Speech Engine is the fallback,** not the default. Its interface is cleaner (transcript in, text out, with an interrupt `AbortSignal`), and it costs the same. But it needs an always-on, publicly reachable Node WebSocket service outside Convex. Choose it if the Custom LLM hop turns out too slow or too awkward in a prototype.
- **"Speech Engine + v3 conversational + realtime STT" is one product, not three parts.** A Speech Engine resource already bundles Scribe Realtime ASR and a selectable TTS model, including `eleven_v3_conversational`. Hand-assembling raw Scribe Realtime and the TTS WebSocket is a third path. It works out to roughly a quarter of the price, but we would have to build turn-taking, interruption and the mobile audio transport ourselves. Not for v1.
- **Model note:** the docs now call Eleven v3 Conversational the *previous generation* real-time model. **Eleven v4 Turbo** (about 100 ms) is the Speech Engine default. Start on v3 Conversational, because it gives expressive mode, the new turn-taking model and audio tags. A/B it against v4 Turbo.
- **Key numbers:** $0.08 per minute for both paths (burst $0.16), plus our own LLM cost. TTS model inference is about 280 ms (v3 Conversational) or about 100 ms (v4 Turbo); Scribe v2 Realtime is about 150 ms. End-to-end turn latency is not published and is dominated by our LLM's time to first token. The Expo SDK exists and needs a dev build; we already use one. Agent conversation data is retained for **2 years by default**, so we must change this before launch.

## The two paths at a glance

| | **Hosted Agents + Custom LLM** (recommended) | **Speech Engine** |
|---|---|---|
| Who owns STT / turn-taking / TTS / transport | ElevenLabs | ElevenLabs |
| Our brain's interface | OpenAI-compatible `/v1/chat/completions` or `/v1/responses`, SSE streaming | Persistent WebSocket: `user_transcript` (full history) in, `agent_response` chunks out |
| Where it runs for us | Convex HTTP action (streaming `ReadableStream`) **[inferred]** | A separate Node/Python server; not Convex |
| Per-turn hook for the safeguard | Yes: every turn is a request to our endpoint | Yes: every turn is an `onTranscript` call |
| Interrupt handling | ElevenLabs stops speaking; whether our upstream request is cancelled is **[unverified]** | `AbortSignal` fires and the SDK cancels the in-flight LLM call |
| Tools | System tools (end call, etc.) passed to our LLM; client tools; webhook tools; MCP | None from ElevenLabs; we own all tool logic |
| Text inside the same talk | `sendUserMessage()` in a voice session; or `textOnly` for a whole text session | `text_only` config exists; client text messages **[unverified]** |
| RN / Expo SDK | `@elevenlabs/react-native`, documented, dev build only | Same client SDK via a conversation token **[inferred, not documented for RN]** |
| Guardrails | ElevenLabs Guardrails 2.0 available | Not offered; all ours |
| Price | $0.08/min + our LLM | $0.08/min + our LLM |
| Max duration | Configurable **[limit not checked for Agents]** | 600 s default, 2,400 s (40 min) max |

## Speech Engine (what the user pointed at)

- **What it is.** "ElevenLabs handles speech-to-text and text-to-speech while your server provides the LLM logic. The SDK manages connection lifecycle, turn-taking, and interruption detection." Launched 2026-05-25 "for custom runtimes rather than a fully hosted ElevenAgents configuration." ([overview](https://elevenlabs.io/docs/overview/capabilities/speech-engine), [changelog](https://elevenlabs.io/docs/changelog/2026/5/25))
- **Shape.** We create a Speech Engine resource with a `ws_url`. ElevenLabs opens a WebSocket to *our* server for each conversation. Each user turn we receive `user_transcript` (the **full conversation history**, roles `user`/`agent`) with an `AbortSignal`. We reply with `session.sendResponse(stream)`. The SDK extracts text natively from OpenAI, **Anthropic Messages** and Gemini streams, so Claude plugs in directly. Connections are verified by a JWT in `X-Elevenlabs-Speech-Engine-Authorization`. ([quickstart](https://elevenlabs.io/docs/eleven-api/guides/cookbooks/speech-engine), [JS SDK reference](https://elevenlabs.io/docs/eleven-api/resources/libraries/speech-engine/javascript-sdk-reference))
- **Needs a public server.** "Speech Engine needs a publicly reachable URL." The SDK attaches to a Node `http.Server` or runs a standalone WebSocket server. Convex HTTP actions document streaming response bodies but not WebSocket upgrades ([Convex HTTP actions](https://docs.convex.dev/functions/http-actions)). So this path means a new always-on service (Fly, Railway or similar) that then calls Convex. **[inferred]**
- **Config** ([create API](https://elevenlabs.io/docs/api-reference/speech-engine/create)):
  - `asr.provider` defaults to `scribe_realtime`.
  - `tts.model_id` is one of `eleven_v4_turbo` (default), `eleven_v3_conversational`, `eleven_v4`, flash/turbo/multilingual.
  - `tts.voice_id`, `supported_voices`, and `expressive_mode` (default true, "automatically disabled for non-v3 models").
  - `turn.turn_eagerness` (patient/normal/eager), `turn_model` (`turn_v3`), and `speculative_turn` ("may increase LLM costs").
  - `conversation.text_only`, `max_duration_seconds`, and `monitoring_enabled`.
  - `privacy.record_voice` (default **true**), `retention_days` (default **-1, unlimited**), `delete_transcript_and_pii`, `delete_audio`, and `zero_retention_mode`.
  - `cascade_timeout_seconds`: 4 s default, 2 to 15 s, the wait for our upstream before ElevenLabs retries.
- **First message.** This is set from the client via overrides and is spoken without calling our server.
- **Security note from ElevenLabs' own skill.** Treat transcripts as untrusted input, because they can carry prompt injection from speech or played audio. ([skill](https://github.com/elevenlabs/skills/blob/main/speech-engine/SKILL.md))

## Eleven v3 Conversational (and v4 Turbo)

- **v3 Conversational** is "an ultra-low-latency version of Eleven v3, optimized for live, back-and-forth dialogue." It keeps context across turns and adapts delivery ("more calmly when a user sounds worried"). It supports 70+ languages and audio tags such as `[sighs]` and `[whispers]`, which affect about the next 4 or 5 words. Selecting it turns on **expressive mode** plus **a new turn-taking system**. ([expressive mode](https://elevenlabs.io/docs/eleven-agents/customization/voice/expressive-mode))
- **Latency:** v3 Conversational is about 280 ms and v4 Turbo is about 100 ms (median inference). Flash v2.5 is about 75 ms. All of these exclude application and network time. The models page now labels v3 Conversational "our previous generation model for realtime speech synthesis." ([models](https://elevenlabs.io/docs/overview/models))
- **Conflict to watch.** The API reference says expressive mode is "automatically disabled for non-v3 models," yet the expressive-mode page's config snippet uses `eleven_v4_turbo`. Whether v4 Turbo keeps tags and expressive delivery inside an agent is **[unverified]**. Test this before choosing.
- **Fit for Xolace.** We already write audio tags into the mirror (`convex/ai/prompts/mirrorAudioTags.ts`). Tone-matched delivery ("calmer when worried") is the companion's whole job.

## Hosted ElevenAgents with a Custom LLM

- **Contract.** Our server must implement OpenAI Chat Completions or Responses, **streamed as SSE** (`data: {json}\n\n`, ending `data: [DONE]`). The configured agent's system tools (end call, language detection, transfer) arrive in the request's `tools` and come back as standard function calls. A slow brain can stream buffer words ("Let me think... ") first. ([custom LLM](https://elevenlabs.io/docs/eleven-agents/customization/llm/custom-llm))
- **Claude.** Claude is not OpenAI-format, so our endpoint translates Anthropic streaming into Chat Completions chunks. That is a small adapter. ElevenLabs also offers Claude natively (Sonnet 5.5, Haiku 4.5 and others), but using it would put model calls outside `convex/ai/` and outside our safeguard. ([LLM list](https://elevenlabs.io/docs/eleven-agents/customization/llm))
- **Backup LLM cascade.** ElevenLabs warns against disabling it. With a custom LLM, decide deliberately whether a fallback model (which would bypass our safeguard) is acceptable. **[inferred risk]**
- **Personalization.** Dynamic variables and overrides can set prompt, first message, LLM, tools and **TTS settings per conversation**. That gives us the companion's name and each person's voice. ([overrides](https://elevenlabs.io/docs/eleven-agents/customization/personalization/overrides), [dynamic variables](https://elevenlabs.io/docs/eleven-agents/customization/personalization/dynamic-variables))
- **Tools.**
  - *Client tools* run in the app, for example to show crisis resources or open the mirror. ([client tools](https://elevenlabs.io/docs/eleven-agents/customization/tools/client-tools))
  - *Webhook tools* let the agent call our backend live. ([webhook tools](https://elevenlabs.io/docs/eleven-agents/customization/tools/webhook-tools))
  - With a custom LLM we don't need webhook tools for memory: our endpoint already sits in Convex and can read memory directly.
  - *Client-to-server events*: `contextual_update` (silent context) and `user_message` (typed text). ([events](https://elevenlabs.io/docs/eleven-agents/customization/events/client-to-server-events))
- **Text fallback in the same talk.** The Expo guide calls `conversation.sendUserMessage(text)` inside a live voice session, so a person can type mid-talk. A whole talk can instead start as `textOnly` (chat mode, billed per message). Switching an already-started session between voice and text-only is **[unverified]**. ([chat mode](https://elevenlabs.io/docs/eleven-agents/guides/chat-mode), [Expo guide](https://elevenlabs.io/docs/eleven-agents/guides/integrations/expo-react-native))
- **Guardrails 2.0.** These cover manipulation detection, content checks and custom LLM-judged rules. Blocking mode adds **200 to 500 ms** per reply; streaming mode may leak about 500 ms of audio before ending the call. They are a backstop at most. Rule 5 requires *our* safeguard. ([guardrails](https://elevenlabs.io/docs/eleven-agents/best-practices/guardrails))
- **Real-time monitoring and control** (end call or take over a live conversation over a WebSocket) is **Enterprise-only**. ([monitoring](https://elevenlabs.io/docs/eleven-agents/guides/realtime-monitoring))

## Ticket questions, answered

**End-to-end turn latency.**
- ElevenLabs publishes component numbers only: Scribe v2 Realtime about 150 ms, TTS about 100 to 280 ms, all "excluding application & network latency." ([models](https://elevenlabs.io/docs/overview/models), [latency](https://elevenlabs.io/docs/eleven-api/concepts/latency))
- A full turn adds the turn-detection wait, our LLM's time to first token, and network time.
- Search results attribute a "sub-100 ms" agent claim to an ElevenLabs blog post, but the page returned 404 **[unverified]**.
- Plan for this: our Convex hop plus safeguard plus Claude TTFT is the latency budget. The safeguard is rule-code plus an OpenAI moderation call, and can run in parallel with the start of generation.
- `speculative_turn` and `turn_eagerness` trade latency against cost and interruptions.
- Measure it in a prototype.

**Custom-LLM support.**
- Agents: OpenAI-compatible Chat Completions or Responses over SSE, required.
- Speech Engine: any stream; Anthropic is supported natively.
- Both pass the full history every turn.

**Per-turn hooks for the safeguard.**
- Both paths route every user turn through our code before anything is spoken. That is the hook.
- On *elevated* or *crisis*, our endpoint can stream a scripted safe reply.
- It can then trigger a client tool for crisis UI and/or the `end_call` system tool (Agents), or `session.close()` (Speech Engine).

**Server and client tools.**
- Agents: client, webhook, MCP and system tools.
- Speech Engine: none, so everything is in our server.
- With either path the brain reads Convex directly, so "live memory" needs no ElevenLabs tool.

**Text-only inside the same session.** See above. Agents documents typed messages inside a voice session; Speech Engine has `text_only` but no documented mid-session typing.

**RN / Expo SDK.**
- Package: `@elevenlabs/react-native` plus LiveKit WebRTC packages and the Expo config plugins (`@livekit/react-native-expo-plugin`, `@config-plugins/react-native-webrtc`).
- "Requires development builds and cannot be used with Expo Go."
- Needs React Native 0.79 or later. We are on 0.86.3 and Expo 57 with `expo-dev-client`.
- The API matches the web React SDK: `ConversationProvider`, `useConversation`, `useConversationClientTool`.
- Source: [RN SDK](https://elevenlabs.io/docs/eleven-agents/libraries/react-native).
- It adds a native module, so a new store build is required. Speech Engine clients use the same `startSession({ conversationToken })` flow on web. That the RN SDK accepts a Speech Engine token is **[inferred]**.

**Retention and zero retention.**
- Agents keep conversation transcripts and audio for **2 years by default**. This can be set to N days, or to 0 for scheduled deletion. ([retention](https://elevenlabs.io/docs/eleven-agents/customization/privacy/retention))
- Per-agent **Zero Retention Mode** stores no recordings and no transcripts or metadata containing PII; data then comes only via post-call webhooks. ([per-agent ZRM](https://elevenlabs.io/docs/eleven-agents/customization/privacy/zrm))
- However, the ZRM product page says ZRM is "available to select enterprise customers" and can be refused for high-risk use cases. ([ZRM](https://elevenlabs.io/docs/eleven-api/resources/zero-retention-mode))
- Whether our plan can turn on per-agent ZRM is **[unverified]**. Ask ElevenLabs.
- At minimum, set `record_voice: false` and a short `retention_days`.
- Speech Engine has the same `privacy` block.
- Either way we already hold the full transcript ourselves, because every turn passes through our endpoint. That transcript becomes the session input.
- This links to the foundation's known gap: "provider zero-retention unverified."

**Pricing.**
- Both paths cost **$0.08/min**; burst over the concurrency limit is $0.16/min. LLM costs are separate. With a custom LLM we pay our own Claude bill. Whether ElevenLabs adds any LLM charge for a custom LLM is **[unverified]**, though the page lists LLM pass-through only for its own models.
- Silence longer than 10 s is billed at a 95% discount.
- Text messages cost $0.003 each.
- Plans: Pro $99 (1,238 min, 20 concurrent); Scale $299 (3,738 min, 30); Business $990 (12,375 min, 40). Enterprise has "significant discounts at scale."
- Sources: [agents pricing](https://elevenlabs.io/pricing/agents), [API pricing](https://elevenlabs.io/pricing/api), [cost FAQ](https://elevenlabs.io/docs/help-center/product/eleven-agents/how-much-does-eleven-agents-cost).
- **Example:** 1,000 Xolace+ people × 30 min/month = 30,000 min, about **$2,400/month** of ElevenLabs before discounts, plus Claude. Concurrency (40 on Business) will bind before minutes do at peak.
- Hand-assembled raw parts would be cheaper. Scribe v2 Realtime is $0.39/hour (about $0.0065/min) and TTS is $0.04 per 1,000 characters. At about 400 spoken characters per minute that is roughly $0.02/min total. **[estimate]** We would then own turn-taking, interruption, echo cancellation and RN audio streaming.

**Voices.**
- The TTS voice can be overridden per conversation, so each person can keep their chosen voice from `convex/lib/voices.ts`.
- Designed voices (Voice Design) and Instant Voice Clones work.
- Professional Voice Clones add latency; default, designed and IVC voices are faster. ([latency](https://elevenlabs.io/docs/eleven-api/concepts/latency))

## Recommendation for Xolace

1. **Build the first talk on hosted ElevenAgents with a Custom LLM.** The custom LLM is a streaming Convex HTTP action under `convex/ai/` (keeping the rule that all model calls live there).
   - Each request: identify the talk and person, run the safeguard on the new user turn, assemble context (memory and semantic profile, read live), stream Claude's reply as Chat Completions SSE, and append the turn to the talk's transcript in Convex.
   - Configure: TTS `eleven_v3_conversational`, voice override per person, `end_call` system tool for wrap-up and the ceiling, `max_duration_seconds` for the hard ceiling, `record_voice: false`, minimal `retention_days`, and ZRM if ElevenLabs grants it.
   - Turn off: the backup LLM cascade to non-our models, the knowledge base, and webhook tools.
2. **Prototype first and measure.** Measure turn latency from the end of speech to first audio on a real device in Ghana and in the US, comparing v3 Conversational with v4 Turbo. Also check whether interruptions cancel our upstream request. If the Convex hop or SSE translation costs too much, move the brain to **Speech Engine** on a small Node service. The client SDK and price stay the same.
3. **Don't hand-assemble Scribe and TTS for v1.** It saves about $0.06/min but rebuilds the hardest part, turn-taking on mobile.
4. **Ask ElevenLabs** about: ZRM eligibility on our plan; whether a custom LLM incurs any ElevenLabs LLM fee; and RN support for Speech Engine tokens.
