# Companion talks: what ElevenLabs keeps, and how to stop it

**Status:** Research note for [#587](https://github.com/xolace-official/xolace_app/issues/587). Written 2026-10-19. Primary sources only (ElevenLabs docs, the OpenAPI spec at `api.elevenlabs.io/openapi.json`, the DPA, the Terms). Nothing here was tested against a live agent.

Setup assumed: hosted ElevenAgents, Custom LLM pointing at a streaming Convex httpAction, transcript delivered to us by the `post_call_transcription` webhook.

## TL;DR

- Without Zero Retention Mode (ZRM), the lowest setting is `retention_days: 0` plus `record_voice: false`. ElevenLabs calls this "Maximum Privacy" / "immediate deletion", but the docs also call 0 "scheduled deletion" and never say when it runs. Deleted rows then live in backups for up to 30 days, and "debugging and moderation logs may still retain data".
- ZRM per agent is a toggle (`privacy.zero_retention_mode`) that stores no recordings and no PII transcripts post-call. It is documented as "available to select enterprise customers". A Custom LLM under ZRM also needs ElevenLabs Support to enable it.
- `DELETE /v1/convai/conversations/{id}` exists. The docs do not say it is immediate for agents. The only "immediate" statement is the general one for generations, and that one carves out logs and the 30-day backups.
- The webhook carries the full transcript, analysis, metadata (including `deletion_settings`), and the client data we passed in. Nothing says ElevenLabs drops its copy on delivery. Under ZRM the docs say the webhook is the *only* way to get call data.
- Bigger than retention: on self-serve plans the Terms grant ElevenLabs a perpetual licence to use Content "to improve the Services". The only control is an account-level training opt-out, and it is not retroactive. The DPA's 30-day deletion on termination is enterprise-only. Self-serve gets "may delete after 180 days of inactivity".

**Recommendation:** before any real user talks, (1) set the training opt-out on the workspace, (2) set `record_voice: false`, `retention_days: 0`, `delete_transcript_and_pii: true`, `delete_audio: true`, (3) call `DELETE /v1/convai/conversations/{id}` from the webhook handler once our copy is committed, and (4) ask ElevenLabs for ZRM with Custom LLM. Treat ZRM as the target and the rest as a stopgap. If ZRM needs an enterprise contract, that is a pricing question for #588, not a technical one.

## 1. `retention_days` and `record_voice`

| Field (`platform_settings.privacy.*`) | Type / default (OpenAPI) | Lowest value | Source |
|---|---|---|---|
| `record_voice` | bool, default `true` | `false`: "Omit audio recordings from your call history" | [Audio saving](https://elevenlabs.io/docs/eleven-agents/customization/privacy/audio-saving), [Update agent](https://elevenlabs.io/docs/api-reference/agents/update) |
| `retention_days` | int, default `-1` ("no retention limit") | `0`: "Scheduled deletion by setting the value to 0" | [Retention](https://elevenlabs.io/docs/eleven-agents/customization/privacy/retention), [Update agent](https://elevenlabs.io/docs/api-reference/agents/update) |
| `delete_transcript_and_pii` | bool, default `false` | – | [Update agent](https://elevenlabs.io/docs/api-reference/agents/update) |
| `delete_audio` | bool, default `false` | – | same |
| `apply_to_existing_conversations` | bool, default `false` | – | same |
| `zero_retention_mode` | bool, default `false`, "no PII data is stored" | – | same |
| `conversation_history_redaction` | object | enterprise-only | [Privacy](https://elevenlabs.io/docs/eleven-agents/customization/privacy) |

What the sources say, and where they disagree:

- **Default is ambiguous.** The Retention guide says "By default, ElevenLabs retains conversation data for 2 years". The OpenAPI schema says the `retention_days` default is `-1` (unlimited). Set it explicitly and read it back.
- **Does 0 mean "keep nothing"?** Not exactly. The Retention page calls 0 "scheduled deletion". The Privacy overview's "Maximum Privacy" recipe says "Disable audio saving and set retention to 0 days for immediate deletion of data". Neither page says when the deletion job runs, or whether it runs before or after the post-call webhook fires. The schema has no `minimum` on the field, so the API does not reject negative values other than -1. Ask ElevenLabs.
- `record_voice: false` stops *new* audio only. "Existing recordings will remain until deleted via retention settings" ([Audio saving](https://elevenlabs.io/docs/eleven-agents/customization/privacy/audio-saving)). Transcripts are still kept.
- Shortening retention with "apply to existing" "may result in immediate deletion of data older than the new retention period" ([Retention](https://elevenlabs.io/docs/eleven-agents/customization/privacy/retention)).
- Every conversation carries `metadata.deletion_settings`: `deletion_time_unix_secs`, `deleted_{logs,audio,transcript}_at_time_unix_secs`, `delete_transcript_and_pii`, `delete_audio` (OpenAPI `ConversationDeletionSettings`; example payload in [Post-call webhooks](https://elevenlabs.io/docs/eleven-agents/workflows/post-call-webhooks)). This lets us **verify** deletion by fetching the conversation and checking the `deleted_*_at` timestamps. Logs are deleted on their own timestamp, separate from audio and transcript.

## 2. Zero Retention Mode

- **Per-agent toggle:** `platform_settings.privacy.zero_retention_mode: true`, or Privacy > Advanced in the dashboard. When it is on: "No call recordings will be stored", "No transcripts or call metadata containing PII will be logged or stored by our systems post-call", and "To retrieve information about calls made with ZRM-enabled agents, you must use post-call webhooks" ([ZRM per-agent](https://elevenlabs.io/docs/eleven-agents/customization/privacy/zrm)).
- **Who gets it:** "Enterprise customers can use Zero Retention Mode" and it "is available to select enterprise customers". Access can be restricted "at ElevenLabs' sole discretion" ([ZRM (Enterprise)](https://elevenlabs.io/docs/eleven-api/resources/zero-retention-mode)). The per-agent page does not repeat the enterprise restriction. Whether the toggle works on a non-enterprise workspace is unverified, so try it on a test agent and ask.
- **Scope:** for agents it covers "API traffic only. UI traffic is not covered" ([ZRM (Enterprise)](https://elevenlabs.io/docs/eleven-api/resources/zero-retention-mode)). The mobile SDK session counts as API traffic, but dashboard test calls do not.
- **Custom LLM + ZRM:** the HIPAA page lists Custom LLM as allowed under ZRM, but says to "Notify ElevenLabs Support of your intention to use a Custom LLM while Zero Retention Mode is active to have the setting enabled" ([HIPAA](https://elevenlabs.io/docs/eleven-agents/legal/hipaa)). Our setup needs that step.
- **Cost of ZRM:** debugging support is limited, analytics are reduced to "non-sensitive metadata like call duration and success rates", and MCP tools are unavailable ([ZRM (Enterprise)](https://elevenlabs.io/docs/eleven-api/resources/zero-retention-mode), [HIPAA](https://elevenlabs.io/docs/eleven-agents/legal/hipaa)). None of this matters to us: our endpoint is the LLM and we keep our own transcript.
- **No-train clause:** ElevenLabs' agreements with third-party LLM providers prohibit training on customer content "whether or not Zero Retention Mode is enabled" ([ZRM (Enterprise)](https://elevenlabs.io/docs/eleven-api/resources/zero-retention-mode)). This does not apply to us, because our LLM is our own Claude call.

## 3. Per-conversation deletion

- `DELETE https://api.elevenlabs.io/v1/convai/conversations/{conversation_id}` returns 200 with an untyped body ([Delete conversation](https://elevenlabs.io/docs/api-reference/conversations/delete)). The reference does not say what is removed (audio, transcript, analysis, logs) or how quickly.
- The only timing statement is general, in the ZRM FAQ under "How does retention work if Zero Retention Mode is not active?": deleting generations via the API "will immediately remove the corresponding audio and text from our database; however, debugging and moderation logs may still retain data related to the generation". Also: "Following data deletion, database items are retained in backups for up to 30 days" ([ZRM (Enterprise)](https://elevenlabs.io/docs/eleven-api/resources/zero-retention-mode)). Whether this applies to agent conversations is our inference, not stated.
- So the honest user-facing promise is "deleted from ElevenLabs' live systems at once, gone from their backups within 30 days, except logs". Logs have no stated limit.

## 4. The `post_call_transcription` webhook

Source: [Post-call webhooks](https://elevenlabs.io/docs/eleven-agents/workflows/post-call-webhooks), [Webhooks](https://elevenlabs.io/docs/eleven-api/resources/webhooks).

- **Payload:** `{ type, event_timestamp, data }`. `data` is a `ConversationHistoryCommonModel`: `agent_id`, `conversation_id`, `status`, `user_id`, `version_id`, `branch_id`, `environment`, `transcript[]` (role, message, tool calls and results, per turn), `metadata` (timing, cost, `deletion_settings`), `analysis` (evaluation and summary), `conversation_initiation_client_data` (overrides and **dynamic variables we passed in**), and `has_audio` / `has_user_audio` / `has_response_audio`. Audio is a separate `post_call_audio` event (base64 MP3), toggled by "Send audio data". Leave it off.
- `analysis` means ElevenLabs runs its own post-call evaluation and summary over the transcript. Under the Constitution Rule we should not want this. Leave evaluation criteria and data collection empty.
- **Delivery:** the endpoint must return 200. Retries are off by default; when on, up to 5 attempts (immediate, 30 s, 2 min, 8 min, 30 min) on 5xx/429/408/connection errors only. The webhook is auto-disabled after 10+ consecutive failures when the last success was more than 7 days ago. It is HMAC-signed (`ElevenLabs-Signature`).
- **Does ElevenLabs keep a copy after delivery?** Nothing says delivery triggers deletion. Without ZRM the conversation stays under the agent's retention settings. With ZRM no PII transcript is stored "post-call", and the webhook is the only channel. Unknown: how long an undelivered payload is held for retries, and whether it is persisted while queued.
- Do not put personal data in dynamic variables. They come back in the payload and are stored with the conversation.

## 5. DPA / GDPR terms

Source: [ElevenLabs DPA](https://elevenlabs.io/dpa), "Last Updated: 8 April 2026". It applies to self-serve customers too, where "Agreement" means the Terms.

- **Sub-processors:** general authorisation (§6.1). The list is on the Trust Center ([compliance.elevenlabs.io](https://compliance.elevenlabs.io/); JS-rendered, could not be read here). There is 30 days' notice of new or replacement sub-processors, given by updating the list (§6.3). We can object on privacy or security grounds within that window, and if it is unresolved either party may terminate the affected Services. To get notice, subscribe to the list.
- **Deletion on termination:** enterprise gets deletion "within thirty (30) days of the expiration or termination" (§9.2.1). **Self-serve** gets only "ElevenLabs reserves the right, but has no obligation to, delete Customer Content … after a period of inactivity of one-hundred and eighty (180) days" (§9.2.2).
- **Carve-outs:** data may be kept where law requires (§9.3.1) or in backups "pursuant to an automatic archival process" until purged under ElevenLabs' standard retention (§9.3.2). The docs put backups at up to 30 days.
- **During the term:** the DPA sets no deletion SLA for customer-instructed deletion. The product controls above (retention, the DELETE endpoint) are the mechanism.
- **Data subject requests:** "commercially reasonable assistance". ElevenLabs forwards requests to us and does not answer them itself (§7.1–7.2).
- **Breach notice:** "without undue delay upon confirming a Security Incident". No hours are specified (§8.1).
- **Transfers:** EU–US DPF or SCCs (Irish law), plus UK Addendum, Swiss, and Brazil terms (§11). Data residency has exceptions for sub-processors, support, and moderation (§13.1).
- **Training (from the Terms, not the DPA):** [Terms of Use](https://elevenlabs.io/terms-of-use) (Last Updated 09 October 2026) §4(d) grants ElevenLabs a "perpetual and irrevocable" licence to use Content "to provide the Services …, to improve the Services, and to develop new services and products". §4(i) offers an opt-out via 'Data use' in 'Terms and Privacy' account settings. It takes effect "once the request has been processed by our team" and "does not affect any uses … of your Content prior to that date". §4(h) bars PHI without a BAA, and BAAs are enterprise-only ([HIPAA](https://elevenlabs.io/docs/eleven-agents/legal/hipaa)).
- **Privacy Policy:** where ElevenLabs serves a business customer it acts as "service provider" or "data processor", and "the business customer's contract with us, not this Policy, governs" ([Privacy Policy](https://elevenlabs.io/privacy-policy)).

## Ask ElevenLabs directly

1. Is per-agent `zero_retention_mode` available on our plan, or only under an enterprise contract? If enterprise, what is the minimum commitment?
2. Can ZRM be enabled with a Custom LLM for a non-HIPAA, non-BAA workspace? (The docs say to notify Support.)
3. With `retention_days: 0`, when does deletion run relative to the call end and the `post_call_transcription` delivery? Is anything left after it runs besides the `deletion_settings` stub?
4. Does `DELETE /v1/convai/conversations/{id}` remove transcript, audio, analysis and logs immediately? What survives, and for how long (backups, debugging logs, moderation logs)?
5. How long are webhook payloads held for retries, and are they persisted while queued?
6. Under ZRM, does the webhook still carry the full transcript and `analysis`? Are moderation and trust-and-safety logs on agent traffic covered?
7. For self-serve: does the training opt-out cover ElevenAgents conversation audio and transcripts (STT input, TTS output)? How long does processing take?
8. Can we get the sub-processor list for the ElevenAgents path (STT, TTS, LiveKit/WebRTC transport), and a deletion SLA in writing outside an enterprise contract?
9. Which audio does the STT/turn-taking layer log for moderation even with `record_voice: false`?
