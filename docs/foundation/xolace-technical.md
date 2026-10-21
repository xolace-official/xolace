# Xolace — technical appendix

*Companion to [`xolace.md`](./xolace.md). Concepts, models, providers and the numbers that shape behaviour. **As of 2026-10-07, commit `7b5bbe3`** — models and limits change; re-check before quoting.*

Term mapping between product and code names is in `xolace.md` §14.

---

## 1. Stack

| Concern | What we use |
|---|---|
| App | Expo / React Native (iOS, Android) |
| Backend | Convex — database, functions, scheduling, workflows, vector search |
| Auth | Clerk (JWT into Convex) |
| Subscriptions | RevenueCat — entitlement `xolace-plus` |
| Peer chat + Xolace channel | Stream |
| Analytics + feature flags | PostHog |
| Language models | Anthropic (Claude) |
| Moderation + embeddings | OpenAI (moderation API, `text-embedding-3-small`) |
| Voice | ElevenLabs — Scribe v2 (speech-to-text), `eleven_v3` (text-to-speech) |

---

## 2. Model calls

Every model call is single-purpose. All live in the backend's `ai/` area.

| Call | Model | Job |
|---|---|---|
| Classifier | Claude Haiku 4.5 | Reads the input: emotions, intensity, specificity, themes, support need. Retries once with stricter instructions on bad output. |
| Articulator | Claude Sonnet 4.6 | Writes the mirror and its refinements (max ~300 tokens). Safe fallback text if it fails. |
| Distiller | Haiku 4.5 | Anonymised text for the peer pool. Skipped on fallback mirrors and crisis sessions. |
| Exercise slot-fill | Haiku 4.5 | Personalises the Sit with this exercise. |
| Reflection — light pass | Haiku 4.5 | Refreshes the profile's trajectory after every completed session. |
| Reflection — consolidation | Sonnet 4.6 (tool loop) | Rewrites the profile. Its only write tool is `update_profile_section`. |
| Kindling | Haiku 4.5 | Picks exactly 4 items from the catalogue, ordered, with a *why* line each. |
| Trusted Bridge | Sonnet 4.6 | Drafts the message. |
| Follow-up card | Haiku 4.5 | Writes the check-in card. |
| Notification copy | Haiku 4.5 | Personalised push wording; template fallback. |
| Quotes | Haiku 4.5 | Session-derived quotes. |
| Vent acknowledgement | Haiku 4.5 | The few words Vent says back. |
| Chat moderation | Haiku 4.5 | Checks Xolacer chat messages after delivery. |

**Not a model call:** the safeguard (rules engine), the mirror plan (pure decision function), profile calibration (deterministic).

---

## 3. The reflection pipeline

### Per reflection

1. **Initiate** — entry types: open prompt, guided entry, body scan, word cloud, voice. Can start from a past entry ("reflect on this"). Rate-limited (§5).
2. **Submit** — input up to 5,000 characters. Mirror generation is scheduled.
3. **Build context** — the person's profile, recent Understandings, intake signals (first session only).
4. **In parallel:** OpenAI moderation · Haiku classifier · episodic memory search (skipped on a first session).
5. **Safeguard** — rules over the moderation result, classifier output and keywords. Levels *none / gentle / elevated / crisis*. Can reject the input outright; survivor narratives are carved out. At *elevated* or *crisis*, `supportNeed` is forced to *none*.
6. **Mirror plan** (pure function) — decides:
   - **tone:** poetic, gentle, direct, adaptive; *witnessed* for Plus
   - **claim strength:** reaching → holding → measured → confident. Episodic matches only count above a similarity floor of 0.35.
   - escalation flag and follow-up tier
   - exercise match (below 0.6 confidence → a generic "reset")
7. **Articulator** writes the mirror → delivered → text-to-speech scheduled.
8. **Store the Understanding** — one `emotional_metadata` row: emotions, intensity, specificity, thematic and language tags, safeguard result, episodic match keys and top score, profile version used, follow-up reason, `supportNeed`.
9. **Fan out:** exercise slot-fill · distiller · episodic memory ingest (30 s later) · escalation record if flagged.

### Refinement

`MAX_TURNS = 2` — one initial mirror plus at most two refinements. Each refinement re-runs moderation and safeguard on the new text, searches memory again, and re-runs the articulator. At the cap, claim strength drops to *holding*.

### Close

- **Confirm** — *confirmed*, *refined* or *gave up*. Confirmation re-weights the importance of the memories that were matched.
- **Choose a path** — solo (Sit with this), peers, or exit. For Plus users choosing peers, semantic matches are precomputed.
- **Finalize** (only on a genuine completion): streak activity · profile stats · Reflection Agent · Kindling · follow-up workflow.

### The Understanding rule

Features read a session's Understanding only through `understanding.getUnderstanding` / `recentUnderstandings`. No feature calls a model to re-derive what's already there.

---

## 4. Memory

| Store | What | Written by | Notes |
|---|---|---|---|
| **Understanding** | One row per session | Mirror pipeline | Single source of truth for what a session meant |
| **Episodic memory** | Embedded past sessions | Ingest job, 30 s after the mirror | Personal namespace per person; a shared namespace for the peer pool. Crisis sessions stored as metadata only. Sessions not kept are never embedded. Daily-quote replies are also ingested. |
| **Profile** | `semantic_profiles`, versioned: recurring themes, emotional signatures, calibration, trajectory | Reflection Agent only | Light pass every completion; consolidation at ≥ 5 sessions or 7 days with activity. Not shown in the UI yet. |

**Not yet in code:** steadiness score, baseline, compounding detection.

---

## 5. Limits

| | Free | Plus |
|---|---|---|
| Start a session | 2 / hour | 10 / hour (burst 5) |
| Mirror generations | 8 / hour (burst 2) | 16 / hour (burst 4) |
| Trusted Bridge drafts | 1 / day* | 5 / day (each draft includes one retry) |
| Vent | 2 min / day | 8 min / day (env-configurable) |
| Kindling | — | 1 set / day |
| Timeline | Last 30 days | Full |
| Notifications | 1 per type per day | same |

\* Bridge is only reachable through Kindling, which is Plus-only, so the free allowance is unreachable in practice (§9).

**Premium check:** `hasPremium()` reads RevenueCat state; `PREMIUM_DEV_OVERRIDE` forces it on in development.

---

## 6. Kindling

- **Runs when:** a genuine completion with a path chosen · `supportNeed` is *light* or *active* · safety below *elevated* · Plus · no set yet today.
- **Free users** in a qualifying session see an invitation instead; buying Plus re-queues that session for Kindling.
- **Generation:** one Haiku call, no tool loop. Picks exactly 4 action types from the catalogue. Items failing validation or binding are dropped, never retried. Fewer than 3 survivors → nothing ships.
- **Catalogue types:** `breathing`, `xolacer`, `bridge`, `read`, `episode_reframe`, `audio_topic_*`, `music_topic_*`.
- **Storage:** `paths` (active / replaced / dismissed / completed) and `path_steps` (pending / done / skipped).

---

## 7. Follow-ups and notifications

| Follow-up tier | First check-in | Second | Expires |
|---|---|---|---|
| Acute | 45 min | +4 h | 48 h |
| Elevated | 12 h | +1 day | 7 days |
| Standard | 24 h | +3 days | 14 days |

Runs as a durable workflow. Push notifications: follow-up nudges, Kindling ready, streak milestones, chat, gentle return (after 30 days inactive, checked every 6 h), pattern nudge (hourly cron). Copy is personalised by Haiku with template fallback.

---

## 8. Safety and data

### Safety mechanics

- **Crisis resources** (currently Ghana): Mental Health Authority 0800 678 678 · emergency 112 · DOVVSU 18555 · IASP directory · support@xolaceinc.com.
- **Escalation** writes an `escalation_events` row and shows the escalation UI. No operator alert.
- **Peer pool entry** (`isPoolable`): session kept, person opted in to contribute, not crisis. Re-checked when the anonymiser runs. Auto-flagged at ≥ 3 reports from distinct people.
- **Peer pool text** falls back to the raw mirror if distillation is missing.
- **Xolacer chat** moderated after delivery: harassment, spam and contact-sharing flag the Stream message; crisis posts a system card; only the verdict is stored.
- **Xolacers** exist only via the `isXolacer` flag, set by an operator (`admin:promoteXolacer`). No training or credential record.

### Data lifecycle

- **Retention** — default *indefinite*. Opt-in tiers delete sessions (full cascade), old profile versions and old feedback after 6 months or 1 year. Daily job.
- **Account deletion** — marked on request, purged by a job every 2 h; signing back in first cancels it. Wipes sessions and everything hanging off them, plus profile, preferences, quotes, conversations, ratings, devices, Stream data and more.
- **Survives deletion:** anonymised escalation events · feedback with links and text stripped · `product_feedback` text (deliberately) · contributed pool reflections · library totals · cohort counts · the talk-time ledger (credits component: balance, grants and charges keyed by profile id, referencing session ids; amounts and times, no text). The component has no delete. It is also kept through a data wipe, so wiping doesn't reset the week's time.
- **Not deleted at third parties:** PostHog person, Clerk user, RevenueCat customer, any provider copies. Stream deletion is fail-open (logged only).
- **Vent** — audio sent to Scribe in memory, never written; transcript never stored. Stored: daily minutes used, a `vent` activity row. The acknowledgement words are logged with `console.log`; their TTS audio sits in storage for 1 h.
- **Analytics** — PostHog server events carry structural fields only. No LLM tracing installed; prompts and outputs don't reach PostHog. Client autocapture records touches with `testID` only.
- **Model providers** — no fine-tuning or data export. Zero-data-retention is an account-level provider setting, unverified.

---

## 9. Clean-up list

Mismatches found while writing this. Small, but each one will confuse someone.

| Item | Detail |
|---|---|
| Free Bridge allowance | `BRIDGE_DRAFTS_FREE = 1` exists, but Bridge is only reachable via Plus-only Kindling. Decide: remove it, or add a free entry point. |
| Kindling comments | Code comments say "2–3" and "3–4" items; the prompt asks for exactly 4. |
| `consent_records` | Recorded but never read for gating; the real gate is the per-session contribute flag. |
| `insight_waitlist` | Table left over from the pre-billing "notify me" flow. |
| Vent log line | `console.log` of acknowledgement words — remove to make "Vent is never stored" literally true. |
| Vessa | Named in the CHANGELOG; not shown in the UI yet. |
