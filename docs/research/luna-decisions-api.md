# Luna direct: OpenAI Decisions API contract, pinning, limits and ZDR

Research for [#541](https://github.com/xolace-official/xolace_app/issues/541), part of map [#475](https://github.com/xolace-official/xolace_app/issues/475). Read on 2026-10-13. No OpenAI API calls were made.

Labels used below:

- **[doc]**: stated in OpenAI's own documentation.
- **[src]**: read from source code (the `openai-node` SDK, generated from OpenAI's API spec, or this repo).
- **[vendor claim]**: OpenAI's own performance or marketing claim, not independently measured.
- **[secondary]**: a third-party write-up. Not trusted. Listed only so nobody repeats it as fact.
- **[unknown]**: not established by any primary source.

Primary sources:

- Decisions guide: <https://developers.openai.com/api/docs/guides/decisions.md>
- Data controls: <https://developers.openai.com/api/docs/guides/your-data.md>
- GPT-6 Luna model page: <https://developers.openai.com/api/docs/models/gpt-6-luna.md>
- Rate limits: <https://developers.openai.com/api/docs/guides/rate-limits.md>
- Deprecations: <https://developers.openai.com/api/docs/deprecations.md>
- `openai-node` Decisions resource: <https://github.com/openai/openai-node/blob/master/src/resources/decisions.ts>, plus its [CHANGELOG](https://github.com/openai/openai-node/blob/master/CHANGELOG.md)

There is **no Decisions page in the API reference**. The reference index (<https://developers.openai.com/api/reference/llms.txt>) has no entry for it, and `/api/reference/resources/decisions.md` returns 404. The SDK's generated types are the closest thing to a reference, so they are used below.

---

## 1. Request/response contract

### Request

`POST https://api.openai.com/v1/decisions` with a Bearer key. [doc]

| Field | Shape | Source |
|---|---|---|
| `model` | `"gpt-6-luna"`, the only supported model | [doc] guide |
| `input` | A string, or an array of `{ role: "user", content: string \| (input_text \| input_image)[] }`. Only the `user` role. No files, audio, tools or item references | [doc] guide; [src] `DecisionCreateParams.input` |
| `questions` | An array of predicate, choice or score questions | [doc] [src] |
| `safety_identifier` | Optional opaque end-user id string | [src] only, not in the guide |

Question shapes ([src] `DecisionCreateParams`, matching the guide's examples):

```ts
{ type: "predicate", name?: string, instructions: string }
{ type: "choice",    name?: string, instructions: string,
  choices: { value: string | boolean, description?: string }[] }   // 2 to 255, unique
{ type: "score",     name?: string, instructions: string,
  levels: { label: string, description?: string }[] }              // ordered low → high
```

- **A predicate has only `instructions`.** There is no `criteria.true` / `criteria.false` and no description field. [src]
- A choice takes **2 to 255** choices, each unique. Values are typed, so `"true"` and `true` are different values. [src]
- A score has no documented min/max number of levels. Level indices start at 0. [doc] [src]
- **Max questions per request: [unknown].** Neither the guide nor the SDK states a limit. The guide only says to put independent questions in one `questions` array, and to send dependent questions as separate requests. [doc]
- **Input size:** no Decisions-specific limit is documented. The Luna model page lists a 922,000 maximum input tokens and a 1,050,000 context window ([model page](https://developers.openai.com/api/docs/models/gpt-6-luna.md)). That this applies to `/v1/decisions` is an inference, so treat it as [unknown]. The model page's endpoint table doesn't list `/v1/decisions` at all. Long-context pricing multipliers apply to Decisions (above 272K on the model page). [doc] guide
- Images: the guide says inline base64 data URLs only, with no hosted URLs and no `file_id`. The SDK docstring says base64 **or public HTTP(S)** URLs, with at most 128 images per request. The two sources conflict. This doesn't matter for Xolace, which sends text only. [doc] vs [src]

### Response

```ts
{
  model: string,                       // echoed. Stamp it on every row.
  answers: Answer[],                   // same order as questions; `name` is echoed
  usage: { input_tokens, input_tokens_details: { cached_tokens, cache_write_tokens },
           output_tokens, output_tokens_details: { reasoning_tokens }, total_tokens }
}
```

[src] `Decision`. The guide says answers come back in the order the questions were asked, and `name` is echoed (`null` if you gave none). [src] docstring, [doc]

| Answer type | Fields | `confidence`? | Full distribution? |
|---|---|---|---|
| `predicate` | `probability` (P(true), 0 to 1) | **No** | The probability *is* the distribution |
| `choice` | `choice`, `probabilities: {value, probability}[]`, `confidence` | Yes | Yes, over every option |
| `score` | `score` (probability-weighted mean of level indices), `probabilities: {value, label, probability}[]`, `confidence` | Yes | Yes, over every level |
| `refusal` | `name` only | No | **No answer at all** |

All four rows are [src] typed and [doc] stated: "Predicates return the estimated probability… Choice and score answers return a probability distribution and a separate `confidence` field." In the SDK types, `confidence` and `probabilities` are required fields, not optional. How `confidence` is computed is **[unknown]**. The guide doesn't define it. Its examples show `confidence` 0.93 next to a top probability of 0.95, and 0.55 next to 0.7.

**Refusals are per question.** "The model declined to answer this question. Other questions in the same request can still receive answers." [src] Each refusal carries only its name, with no reason. A refusal is a third outcome next to true/false. On a crisis battery it **must not be read as "no risk"**. #479's contract needs an explicit `refused` state per answer. Whether Luna refuses self-harm questions about user text is **[unknown]**, and the eval set should measure it.

Pricing: $0.10 per 1M input tokens, and "You pay only for input tokens". [doc] guide. The response still reports `output_tokens` and `reasoning_tokens`. [src] Whether output is billed at $0 on Decisions or the guide is simplifying is [unknown]. Regional processing adds a 10% premium. [doc]

## 2. Pinning and deprecation

- **There is no way to pin.** The Luna model page lists exactly one snapshot, `gpt-6-luna` ("Default snapshot: `gpt-6-luna`"; "Snapshots: `gpt-6-luna`"). There is no dated snapshot. [doc] [model page](https://developers.openai.com/api/docs/models/gpt-6-luna.md) The guide: "`gpt-6-luna` is the only model currently available." [doc]
- The response echoes `model`. [src] Whether it ever carries a dated id that would reveal silent updates is [unknown]. Stamp it anyway.
- **Beta status:** "The Decisions API is in public beta, and we expect to GA in the coming weeks." [doc] guide
- **Deprecation policy:** the general notice periods are at least 6 months for GA models, at least 3 months for specialized variants, and possibly about 2 weeks for `preview`-named models, all "unless safety or compliance concerns require a faster timeline". [doc] [deprecations](https://developers.openai.com/api/docs/deprecations.md) **No policy covers a beta *endpoint*** or changes to the model behind an alias. Neither is mentioned. [unknown]
- Conclusion: Luna direct has the same drift problem as gateway Jev (#483), and the same fix applies: stamp every row (`model` echo + battery version) and run the daily synthetic canary to mark drift boundaries. Unlike Jev, a model *retirement* would at least be announced by email to active users. [doc] deprecations

## 3. Rate limits, latency, transport

**Rate limits.** The published Luna limits ([doc] [rate limits](https://developers.openai.com/api/docs/guides/rate-limits.md), [model page](https://developers.openai.com/api/docs/models/gpt-6-luna.md)):

| Tier | RPM | TPM |
|---|---|---|
| Build | 5,000 | 2,000,000 |
| Launch | 10,000 | 10,000,000 |
| Grow | 30,000 | 180,000,000 |

Whether `/v1/decisions` draws from this same per-model bucket, or has its own, is **[unknown]**. Nothing says so either way. The org's real numbers are at [Settings → Organization → Limits](https://platform.openai.com/settings/organization/limits). [doc] Shadow volume (a few requests per reflection or DM) sits orders of magnitude under even Build. Errors are `429 rate_limit_error/slow_down` and `503 server_is_overloaded`, both possibly with `Retry-After`. [doc] rate limits

**Latency.**

- [vendor claim] "returns typed answers about 10x faster than the Responses API" (guide). No absolute number, percentile, region or SLA is given.
- [secondary, untrusted] An OrcaRouter blog reports about 150 ms vs about 1.3–1.6 s, and its figures contradict each other ([e.g.](https://www.orcarouter.ai/de/blog/openai-decisions-api-gpt-6-luna)). Don't use it.
- Our number must be measured from Convex's region. **[unknown]**

**Transport: raw `fetch` is enough.** [src] reasoning:

- The endpoint is a single JSON `POST` with a Bearer key, the same shape `convex/ai/providers/moderation.ts` and `convex/ai/cachedActions.ts` already send to `/v1/moderations` with `fetch` from V8, using the existing `OPENAI_API_KEY`. No streaming, no files, no Node built-ins.
- The official SDK needs `openai >= 7.30.0`, the release that "add[ed] standalone Decisions support" on 2026-10-06 ([CHANGELOG](https://github.com/openai/openai-node/blob/master/CHANGELOG.md)). Latest is 7.32.0. This repo has **no `openai` package**. [src] `package.json`
- The installed `@ai-sdk/openai@3.0.80` (used for embeddings in `convex/rag.ts`) has no Decisions support. A grep of its `dist/` for "decisions" finds nothing. [src]
- Recommendation: raw `fetch` plus a hand-written type copied from `openai-node`'s `decisions.ts` (about 40 lines). That means no dependency PR and no coupling to the `ai@7` bump that #483 needs for Jev. You give up the SDK's automatic 429/503 retry. For a shadow lane that drops late results, the right move is to not retry anyway. Set an `AbortSignal.timeout` instead. Whether V8 behaves at runtime is the same proven path as moderation, so the risk is low.
- The only thing to watch: an off-path shadow call must not burn the moderation call's rate budget. Both use the same key and org. Separate per-model buckets *probably* isolate them, since moderation uses `omni-moderation-latest` and Decisions uses `gpt-6-luna`, but see the unknown above.

## 4. Retention and ZDR

**Defaults** ([doc] [data controls](https://developers.openai.com/api/docs/guides/your-data.md), per-endpoint table):

| Endpoint | Training | Abuse-monitoring retention | Application state | ZDR eligible | Private Retention / Safety Retention eligible |
|---|---|---|---|---|---|
| `/v1/moderations` (used today) | No | **None** | None | Yes | No |
| `/v1/embeddings` (used today, `rag.ts`) | No | **30 days** | None | Yes | No |
| `/v1/decisions` (Luna direct) | No | **30 days** | None, with exceptions | Yes, with limitations | **Pending confirmation** |

- **Without ZDR, Decisions keeps prompts in abuse-monitoring logs for up to 30 days**, "unless longer retention is required by law, or is reasonably necessary to protect our services". Moderation keeps nothing. So **"OpenAI already processes this text" is true for the processor but not for the retention term**. Luna direct moves crisis text from a no-retention endpoint (moderation) to a 30-day one. It matches what embeddings already do with the text it embeds. [doc]
- Decisions exceptions: prompt caching may hold encrypted KV tensors on GPU-local storage for up to 24h, even under ZDR. The CSAM image exception doesn't apply to text. [doc] `/v1/decisions` section
- **With ZDR**, customer content is excluded from abuse-monitoring logs. ZDR (and Modified Abuse Monitoring) is "subject to prior approval by OpenAI and acceptance of additional requirements". Customers inquire via [sales](https://openai.com/contact-sales). [doc] No public eligibility criteria are given. [unknown]
- OpenAI "reserve[s] the right" to make models ineligible for ZDR for a specific customer, with written notice, under Private Retention or Safety Retention. Decisions' eligibility for those modes is "Pending confirmation". [doc]
- **HIPAA:** "The Decisions API is eligible for HIPAA use under an executed OpenAI Business Associate and Healthcare Addendum, subject to the applicable account configuration requirements." [doc] The guide says ZDR and HIPAA are "for eligible customers". [doc] How a BAA is obtained is not documented beyond contacting sales. [unknown]
- Data residency / regional processing: US and EU (EEA + Switzerland) only. [doc]

**Does the Xolace org have ZDR? [unknown].** This pass can't see org settings. To check ([doc] "Configuring data retention controls"):

1. As an org owner, open <https://platform.openai.com/settings/organization/data-controls/data-retention> (Settings → Organization → Data controls).
2. **If there is no "Data Retention" tab, the org is not approved, so no ZDR.** The tab only appears "once your organization has been approved for data retention controls".
3. If the tab exists, check the org-level choice (ZDR vs Modified Abuse Monitoring). Then check the **project** that issues `OPENAI_API_KEY` (the Convex prod env), because a project can be set to `None`, which disables it.
4. A BAA would be a separate signed addendum. Check contracts or email, not the dashboard.

## 5. Jev batteries mapped onto Decisions

Battery source: `convex/ai/jev/batteries.prototype.ts` on `prototype/495-jev-batteries` ([file](https://github.com/xolace-official/xolace_app/blob/prototype/495-jev-batteries/convex/ai/jev/batteries.prototype.ts)).

| Jev construct | Decisions equivalent | Fit |
|---|---|---|
| `boolean` (Noul) + `instructions` | `predicate` + `instructions` | Direct. Neither returns a confidence |
| `boolean.criteria.true/false` | **None.** A predicate has no criteria field | Gap. Fold it into `instructions`, e.g. "…? Counts: <true>. Doesn't count: <false>." That reintroduces the negations the battery's wording rule (#495) bans, so the battery needs a Luna-specific wording pass and its own anchor cases. It affects `si_intent`, `si_passive`, `self_harm_now`, `in_danger_now`, `harassment`, `spam`, `contact`, `requiresFollowUp` |
| `choice.criteria` map `{key: description}` | `choices: [{value: key, description}]` | Direct. Order is preserved as an array, which suits #479's arrays-by-order storage |
| 32-option `primaryEmotion` | choice with 32 choices | Fits. Cap is 255 |
| 31 `tag_*` booleans | 31 predicates | Fits *if* the per-request question cap allows about 37 questions in the emotion request. **[unknown]**. Fallback: split into two requests |
| `score.criteria: string[]` | `levels: [{label}]` (optionally with `description`) | Direct |
| **State object** (`{text}`, `{sender_role, message}`, `{entry_type, time_of_day, text}`) | **None.** `input` is a string or user messages | Gap. Serialize the state into the input text (e.g. labelled lines). The model then sees the field labels as text, so the DM `sender_role` and the emotion `entry_type` framing need checking in the eval |
| Hierarchical choice (TypeSafe cookbook; #495 left `granularLabel` out) | No native support | Same as Jev: a code-side pattern (speculative parallel choices, or two requests). The guide says dependent questions go in separate requests |
| Max-choices / multi-select count | None. Choice picks exactly one | The battery already avoids this (tags are fanned out as booleans, and code keeps 2 to 5) |
| Refusal | `refusal` answer type | **New outcome** for #479 (no Jev equivalent was checked here). Add an explicit `refused` state |
| Two parallel requests (crisis + emotion) | Fine | Unaffected |

So beyond `criteria.false`, the real gaps are: **no structured state** (it has to go in the input text), **no criteria on predicates at all** (`true` as well as `false`), **an unknown question cap** for the 37-question emotion request, and the **refusal outcome**.

---

## What this changes for open tickets

- **#542 (does the privacy gate cover Luna direct?)** The map's premise "OpenAI already processes this text" holds for the *processor*, but not for retention. Moderation has no retention, while Decisions keeps prompts in abuse logs for up to 30 days by default, the same as embeddings. Unless the org has ZDR, which is unknown and checkable as above, Luna direct adds 30-day retention of crisis text that today has none. HIPAA needs a BAA, and Private Retention / Safety Retention eligibility is "pending confirmation". #542 can't resolve this to "already covered" without the ZDR check. If it compares against embeddings, which text `rag.ts` embeds sets the precedent.
- **#543 (Luna call path)** Raw `fetch` from V8 with the existing `OPENAI_API_KEY`, in the moderation pattern. No `openai` package (>= 7.30.0) and no AI SDK change. Pinning is impossible (single snapshot `gpt-6-luna`, beta endpoint), so reuse #483's stamp-plus-canary. Stamp the echoed `model`. No retries for shadow, with a hard timeout instead. Handle `refusal` explicitly. The question cap must be confirmed with one keyed synthetic call before the emotion battery's shape is fixed.
