# Kindling v1 — background-generated support actions after a session

**Status:** Locked spec. Build from this; no design decision remains open.
**Wayfinder map:** [#268](https://github.com/xolace-official/xolace_app/issues/268)
**ADRs:** [0008](adr/0008-kindling-is-not-the-existing-path-concept.md) ·
[0009](adr/0009-kindling-generation-is-premium-only-no-free-compute.md) ·
[0010](adr/0010-kindling-generation-is-a-standalone-model-call.md)

---

## 0. What this is

After a session the pipeline judges needs support, Xolace generates — in the
background, for Xolace+ users only — a **kindling**: a small bundle of **3–4
support actions** (each a **twig**), bound to real content (a support-audio or
music track, a breathing exercise, a xolacer). The user gets a notification, a
Today-card entry, and a dedicated screen where they tend twigs in any order.

**Terminology** (locked in [#269](https://github.com/xolace-official/xolace_app/issues/269),
recorded in `CONTEXT.md`):

| Prose / UI | Code / schema | Meaning |
|---|---|---|
| **kindling** | `paths` table, `convex/ai/paths/`, route `(protected)/kindling/` | the generated bundle |
| **twig** | `path_steps` row | one action in the bundle |
| **next step** | `path-selection` screen, `selectPath` / `completePath`, `session.state` `path_*` | the existing free, immediate, single post-mirror choice — **unchanged, unrelated** |

"Path" survives only as an internal word. No user-facing copy says "path" for
this feature. See [ADR 0008](adr/0008-kindling-is-not-the-existing-path-concept.md).

**Scope.** Xolace+ only — no free-tier generation at all
([ADR 0009](adr/0009-kindling-generation-is-premium-only-no-free-compute.md)).
Every schema change is additive. This is a planning artifact: it produces the
build spec, not the implementation.

---

## 1. Trigger — `supportNeed` on the Understanding

The classifier emits one new graded field on `emotional_metadata` (the
per-session Understanding object, Cognition Layer Phase 2):

```ts
// convex/schema.ts — emotional_metadata
supportNeed: v.optional(
  v.union(v.literal("none"), v.literal("light"), v.literal("active")),
),
```

- **One extra field on the existing classification call** — not a new pass, not a
  new model call. It rides the classifier that already writes this row.
  (Constitution Rule: no LLM call to re-derive what the Understanding knows.)
- Read only via `internal.understanding.getUnderstanding(sessionId)`.
- **Crisis / escalation forces `supportNeed: "none"`.** Safeguard owns that
  person; `safeguardLevel` above the escalation threshold ⇒ `none` regardless of
  emotional content. Kindling never competes with a safety response.
- `v.optional` for rollout: pre-classifier-bump rows have it `undefined`, read as
  `"none"` (no kindling). No backfill.

**Gate:** kindling generation is attempted **iff** `supportNeed ∈ {"light",
"active"}` **and** the user has Xolace+ at completion time.

---

## 2. Generation

### 2.1 Hook

A sibling `scheduler.runAfter(0, …)` fired from `finalizeCompletion` on any
**genuine completion** — `pathCompleted: true` with a `pathChosen` set (solo,
peers, or exit) — never on the abandoned-session cron's stranded
reconciliation (`pathCompleted: false`, no real finish). Placed alongside the existing
`profileStats.updateAfterSession` / `reflectionAgent.trigger.onSessionComplete`
siblings in `finalizeCompletion` (`convex/sessions.ts` ~L100–115), gated so it
does not fire on the `completePath` route.

```ts
await ctx.scheduler.runAfter(0, internal.ai.paths.generate.run, {
  sessionId: session._id,
  emotionalProfileId: session.emotionalProfileId,
});
```

- **Off the critical path.** The mirror and session-end render never wait on it.
- **Best-effort.** All failures logged, never thrown (§6).
- **Premium check inside `generate.run`**, not at the call site — one place, uses
  `hasPremium` (`convex/lib/premium.ts`). Non-premium ⇒ no-op, no log noise.

### 2.2 Model call

Standalone, under `convex/ai/paths/` — **not** folded into the Phase 3
Reflection Agent ([ADR 0010](adr/0010-kindling-generation-is-a-standalone-model-call.md);
cross-ref `docs/cognition-layer-phase3.md`). One **Haiku-class** call, no tool-use
loop.

**Input** (assembled by an internalQuery, all already-known signal — no new
derivation):

- `getUnderstanding(sessionId)` — `primaryEmotion`, `granularLabel`,
  `intensity`, `specificity`, `thematicTags`, `userLanguageTags`,
  `temporalContext`, `supportNeed`, `safeguardLevel`.
- The rendered **semantic profile** (`semanticProfiles.getCurrent` +
  `renderSemanticProfile`) — may be `null` (cold start); the call proceeds.
- The **action catalog** (§3.1) — the action *types*, with `modelDescription`.
- Premium tier (always `plus` here — passed for prompt framing, not a branch).
- **No episodic RAG in v1.** Carried as fog (§11).

**Output contract:** a JSON array of **3–4** objects:

```ts
{ actionType: string,   // must be a catalog key
  order: number,         // 1-based suggested sequence
  why: string }          // user-safe, second person, non-clinical, one sentence
```

**`why` line rules** (locked in [#273](https://github.com/xolace-official/xolace_app/issues/273);
exact wording is a build-time tuning loop against the live model, repo precedent
`docs/confidence-aware-mirroring.md` ~5–6 rounds):

- second person, present tense;
- names something the user actually said in-session ("you said…", "you came back
  to…");
- states plainly what the action does — **no outcome promise, no claim**;
- **no clinical register** — never *anxiety / symptoms / cope / regulate /
  grounding / manage*;
- one sentence, two beats, ~12–22 words.

The prompt uses **negative examples only** (repo precedent:
`feedback_prompt_examples_cause_fixation`). Response is length- and
vocabulary-validated on parse; a twig whose `why` fails validation is dropped
(§6), not retried.

Model constant + version string live in `convex/ai/providers/anthropic.ts`
(`PATHS_MODEL`, `PATHS_VERSION`), mirroring the `mirrorModelVersion` format.
Generation refs (`model`, `version`, `promptTokens`/`completionTokens` if cheap
to capture) are stored on the `paths` row for eval.

Rate limit: a token bucket in `convex/lib/rateLimits.ts` keyed by profile
(runaway guard; ~1 per qualifying session).

### 2.3 Binding — deterministic, downstream, no model call

The model picks *action types*; a pure function binds each to a concrete target.

| `actionType` family | Binding rule |
|---|---|
| `audio_topic_*` | `audio_tracks` where `family="support"` (§4) `.eq("topic", <the entry's topic>)`, tag-match `emotions`/`themes` against the twig's emotion/theme set in memory, sort by score then **`slug`** (order-independence only — not the tiebreak itself), then break the remaining tie with a deterministic hash of the session's `primaryEmotion`/`secondaryEmotion`/`thematicTags` (#364). Episodes and standalones of the topic compete in the same pool — `tier` never filters (§8). |
| `music_topic_*` | same rule, `family="music"`. |
| `episode_reframe` | `audio_tracks` where `family="support"` **and `series` set** for the "reality-not-false-hope" series, tag-match, same hash tiebreak. |
| `breathing` | the existing **sit-with-this** exercise (no new content). |
| `bridge` | `{ exercise: "trusted-bridge" }` — the existing Trusted Bridge flow (no new content). |
| `xolacer` | the existing `sessionSuggestion` ranker (no new content). |

`breathing` and `bridge` both bind to a fixed non-content marker rather than a
database row — the same trivial always-succeeds binder `breathing` already
used (ADR 0012's "skips the binder entirely" wording for bridge is corrected
by this: it goes through `bindTwig` like everything else, it just never
misses).

Binding produces `path_steps.params` (e.g. `{ slug }` for audio, exercise id for
breathing, a xolacer ref). **Unbindable twigs are dropped** (§6).

---

## 3. Catalog

### 3.1 Action catalog — `convex/ai/paths/catalog.ts`

Action **types**, in code, not a table. Extensible shape:

```ts
{ actionType: string,
  emotions: string[],          // binder tag axis
  themes: string[],            // binder tag axis
  supportNeedFit: ("light" | "active")[],
  premium: boolean,            // always true in v1
  humanContact: boolean,       // true only for xolacer
  alwaysAvailable: boolean,    // breathing = true; content-bound = false
  modelDescription: string }   // what the generation model sees
```

- **Audio is a family**: one entry per topic — `audio_topic_anxiety`,
  `audio_topic_grief`, … — not one entry per track. Same for music
  (`music_topic_*`).
- **`episode_reframe`** — one **cross-topic** entry for the founder's Track 2
  ("Reality, Not False Hope"): `supportNeedFit: ["light", "active"]`,
  `premium: true`, `humanContact: false`, `modelDescription` pointed at
  self-invalidation / toxic positivity / "I should be over this". Track 1
  ("The Spectrum") gets **no** new entry — it rides the existing `audio_topic_*`
  entries; its episodes compete with standalone tracks on tags (§8).
- Music is a **standalone action type** the model may pick as one of the 3–4
  twigs (decision 16), not an ambient bed under other actions.

### 3.2 `audio_tracks` table — `convex/schema.ts`

One table, two families, `series` fields make an episode. Settled across
[#270](https://github.com/xolace-official/xolace_app/issues/270) /
[#272](https://github.com/xolace-official/xolace_app/issues/272) /
[#321](https://github.com/xolace-official/xolace_app/issues/321) /
[#324](https://github.com/xolace-official/xolace_app/issues/324).

```ts
audio_tracks: defineTable({
  slug: v.string(),                 // stable id: binding + idempotent re-ingest
  family: v.union(v.literal("support"), v.literal("music")),
  title: v.string(),
  topic: v.string(),                // the audio_topic_* / music_topic_* entry
  tags: v.array(v.string()),        // shared emotion/theme vocab, both families
  key: v.string(),                  // R2 object key, e.g. `${family}/${slug}.m4a`
  thumbKey: v.string(),             // R2 key, content-addressed: `thumb/${thumbSha256}.webp`
  durationSec: v.number(),
  sha256: v.string(),               // audio re-ingest idempotency
  thumbSha256: v.string(),          // thumbnail idempotency, independent of audio
  active: v.boolean(),              // retire (licence lapse) without deleting
  newUntil: v.optional(v.number()), // ms epoch; in the Browse "New" shelf while > now

  // support-family
  narrators: v.optional(v.array(v.string())),  // display strings: ["Sage"], ["Sage","Ash"]

  // episode (support-family with a series)
  series: v.optional(v.string()),         // series slug
  seriesTitle: v.optional(v.string()),    // denormalised for browse tiles
  episodeNumber: v.optional(v.number()),
  tier: v.optional(v.number()),           // acuity 1–4 (Track 1 "The Spectrum")
  safetyReviewedAt: v.optional(v.number()),

  // music-family
  licence: v.optional(licenceValidator),  // required at write for family="music"
})
  .index("by_slug", ["slug"])
  .index("by_family_and_topic", ["family", "topic"]);
```

- **Storage backend: Cloudflare R2 via `@convex-dev/r2`**, from day one
  ([#321](https://github.com/xolace-official/xolace_app/issues/321), reversed on a
  pre-revenue constraint: Convex Free includes 1 GB egress/month ≈ 170 plays —
  breaks during TestFlight beta; R2 free tier is 10 GB storage + unlimited free
  egress ⇒ $0 through the entire planning scenario). Rows, licence metadata, the
  premium gate, and licence-proof PDFs stay on Convex; only the audio/image blobs
  move.
  **Blocked on one founder check:** whether R2 requires a payment method on file
  to enable within free limits. If it does and that blocks, revert to bare Convex
  `ctx.storage` (`storageId: v.id("_storage")` / `thumbStorageId`) — the row is
  otherwise unchanged.
- **`licenceProofStorageId` stays on Convex storage** (`v.optional(v.id("_storage"))`) —
  private internal receipts, never served to clients.
- **No `premium` field on the row.** All kindling is Plus-only, so the gate lives
  in the read query (`requirePremium`), never in per-row data.
- **`narrators`** replaced #272's `voiceSlug` union (amendment via #324): free
  display strings rendered after "Narrated by …". Curated audio is a pre-rendered
  MP3 — there is no per-request TTS — so narrator is display-only. The Plus
  `VOICE_CATALOG` / `voiceSlugValidator` (`convex/lib/voices.ts`) keep their exact
  mirror + vent meaning and are **not touched by kindling**.
- **Discriminated-union upsert validator** (tight at write, optional at rest):

  ```ts
  args: { track: v.union(
    v.object({ family: v.literal("support"), slug, title, topic, tags, key, thumbKey,
               durationSec, sha256, thumbSha256, newUntil: v.optional(v.number()),
               narrators: v.optional(v.array(v.string())),
               series: v.optional(v.string()), seriesTitle: v.optional(v.string()),
               episodeNumber: v.optional(v.number()), tier: v.optional(v.number()),
               safetyReviewedAt: v.optional(v.number()) }),
    v.object({ family: v.literal("music"), slug, title, topic, tags, key, thumbKey,
               durationSec, sha256, thumbSha256, newUntil: v.optional(v.number()),
               licence: licenceValidator }),
  )}
  ```

- **`licence` object** ([#321](https://github.com/xolace-official/xolace_app/issues/321) §5):
  `source`, `sourceUrl`, `licenceName`, `licenceUrl`, `artist`,
  `attributionRequired`, `attributionText` (**stored verbatim** so the credit
  can't drift), `acquiredAt`, `licenceRef?`, `licenceProofStorageId?`.
- **Curation source: Pixabay Music** (royalty-free, instrumental-only,
  founder-confirmed). One open legal read of its "standalone distribution"
  clause — get a lawyer read before curating.

### 3.3 Read path

`paths.getBoundAudioTrack({ sessionId })` (or the twig's `slug`): `requireAuth` +
`requirePremium` → load `by_family_and_topic` candidates → deterministic pick
(§2.3) → return `{ slug, title, durationSec, narrators?, url, thumbUrl,
attributionText?, tier?, showCrisisLine }`, URLs minted per request via
`r2.getUrl(key)`. `showCrisisLine = tier === 4` is derived server-side so the
client never re-derives the safety rule from raw metadata (§8). The binder
stores only `{ slug }` in `path_steps.params`; `tier` is read off the resolved
`audio_tracks` row here, so the safety metadata survives binding without
being copied into the step.

**R2 URLs expire** (component default 15 min). The client audio hook (shaped like
`use-mirror-audio.ts`) needs a **refetch-on-expiry** path — a track paused and
resumed 40 minutes later has a dead URL. ~30 lines; does not exist today; it is
the one real cost of the R2 switch and is needed for both delivery and Browse.

Any track with `attributionRequired: true` must render `attributionText`
wherever it plays.

### 3.4 Ingestion

Team-curated catalogue, ~200+ combined support + music tracks (episodes included)
in the first batch. **Checked-in manifest + a ~40-line repo script** over the
upload-URL flow (`npx convex import` rejected: `--replace` would take the
mirror-audio blobs with it):

1. **Manifest** committed beside a local media folder — one entry per track:
   `slug`, `family`, `title`, `topic`, `tags`, `durationSec`, `sha256`,
   `thumbPath`, `thumbSha256`, optional `newUntil` (or `newForDays` the script
   resolves), plus family fields (`narrators` / series fields / `licence`).
   Series-level metadata (title, blurb, art) lives in the manifest, **not** the
   row.
2. **Per file:** upload the thumbnail if its `thumbSha256` is not already mapped
   to a key this run or on an existing row → upload the audio → one `upsert`
   carrying both keys. Upload URLs expire after 1 h; mint per file. No file-size
   limit on this path.
3. **`upsert` keyed `by_slug`** — idempotency lives here: unchanged `sha256` ⇒
   delete the fresh blob, no-op; changed ⇒ patch the row, delete the old audio
   blob. **Never delete a thumbnail blob on re-ingest** — content-addressed keys
   mean many rows share one; an orphaned ~50 KB image is cheaper than
   reference-counting.
4. **Ingest assertion:** a row with `tier >= 3` **must** carry `safetyReviewedAt`
   or the script rejects it (§8). Drive with `convex run` against
   `internalMutation`s, concurrency 4–6. No new secret, no admin UI.

Thumbnail spec: square 1:1 ~600×600, WebP/JPEG, ≤80 KB. `expo-image` disk-caches,
so thumbnail egress is rounding error.

---

## 4. Binding families & cascade — see §2.3 and §7.

---

## 5. Fallback

Best-effort, logged, never thrown, off the critical path.

- A twig whose action type does not bind, or whose `why` fails validation → **drop
  it**.
- **Ship the kindling if ≥ 2 twigs remain.**
- **< 2 remain → no kindling, no notification, no Today row.** No synthetic
  default kindling, ever.
- Every drop and every no-ship is logged with the reason (PostHog +
  `console.error`) for tuning; nothing surfaces to the user.

---

## 6. Lifecycle

- **One active kindling per user.** A new qualifying session sets the previous
  kindling `status: "replaced"` (**archived, not deleted**) before writing the
  new one. Emits `path_replaced`.
- **Done** = every twig `done` or `skipped`, **or** the user dismisses
  (`status: "dismissed"`, emits `path_dismissed`).
- **No age-based expiry** in v1. A 30-day stale sweep (`status: "expired"`) is
  fog (§11) — add only if it proves needed.
- Twig completion feeds `profileStats` (only from the kindling screen itself —
  see §9.6).

---

## 7. Data model & cascade

```ts
paths: defineTable({
  emotionalProfileId: v.id("emotional_profiles"),
  sessionId: v.id("sessions"),              // the session that generated it
  emotionalProfileVersionId: v.optional(v.id("semantic_profiles")),  // profile version in context
  status: v.union(
    v.literal("active"), v.literal("replaced"),
    v.literal("dismissed"), v.literal("completed"),
  ),
  model: v.string(),
  modelVersion: v.string(),
  generatedAt: v.number(),
})
  .index("by_profile_and_status", ["emotionalProfileId", "status"])
  .index("by_session", ["sessionId"]);

path_steps: defineTable({
  pathId: v.id("paths"),
  actionType: v.string(),                   // catalog key
  order: v.number(),                        // model's suggested sequence
  why: v.string(),
  params: v.any(),                          // binding output: { slug } | exerciseId | xolacerRef
  state: v.union(v.literal("pending"), v.literal("done"), v.literal("skipped")),
  why_: v.optional(v.string()),             // (reserved) tuning notes
})
  .index("by_path", ["pathId"]);
```

- 3–4 `path_steps` rows per `paths` row.
- **Both tables added to `SESSION_CASCADE_TABLES`** (`convex/lib/sessionCascade.ts`) —
  they carry a `sessionId` (directly on `paths`, transitively for `path_steps` via
  `pathId`). `purgeSessions` deletes `path_steps` by `pathId` then the `paths`
  row. `sessionCascade.test.ts` walks the schema and **fails** if a `sessionId`
  table appears in neither the cascade list nor `SESSION_ID_EXEMPT` — so this is
  not optional. Cascade covers `dataWipe`, `accountDeletion`, `dataRetention`.
- **`audio_tracks` is cascade-exempt by construction** — no `sessionId`, no
  `profileId`. Written reason for the record: **catalogue rows are shared across
  every user and outlive every session; deleting a user, wiping their data, or
  cascading a session must never touch the catalogue.** It needs no
  `SESSION_ID_EXEMPT` entry either — the walk only classifies tables that carry a
  `sessionId`.

---

## 8. Podcast episodes (v1 content family)

Founder call (map decision 20), pinned in
[#324](https://github.com/xolace-official/xolace_app/issues/324). **Episodes ship
in v1.**

- A **Topic** carries standalone support tracks **plus** one or more ordered
  **series** of episodes. v1 series: **Track 1 "The Spectrum"** (awareness, 4
  acuity tiers: Everyday Mind → The Weight of It → When It's Heavy →
  Misunderstood) and **Track 2 "Reality, Not False Hope"** (shorter
  anti-toxic-positivity reframes).
- **An episode is `family: "support"`** with `series` set (+ `seriesTitle`,
  `episodeNumber`, `tier`, `safetyReviewedAt`). **No `"episode"` arm on
  `family`** — the #272 union is untouched. A standalone support track leaves all
  five fields null. `by_family_and_topic` is unchanged; Browse groups by `series`
  client-side.
- **Binder axis (extends §2.3):** `tier` is **editorial** — it sets production
  tone, the review process, and Browse grouping. It **never gates binding**:
  every tier, including tier 4 (Misunderstood), binds like any other row.
  Tier 4's awareness/understanding framing is what makes it safe to auto-serve
  — **conditional on** the player contract below: tier-4 auto-binding is only
  enabled once every bound-track player renders the crisis-resource line from
  `showCrisisLine` (§3.3). Until then the ingest manifest ships no tier-4 rows.
  Track 1 episodes bind through the existing `audio_topic_*` entries and compete
  with the topic's standalone tracks on tag score, hash tiebreak (#364). (Crisis forces
  `supportNeed: "none"` — those users get no kindling regardless.)
- **Track 2** = the cross-topic `episode_reframe` action type (§3.1).
- **Editorial safeguards — curation playbook + two code touches:**
  - ingest **rejects `tier >= 3` without `safetyReviewedAt`** (§3.4);
  - **every** bound-track player (kindling twig, Browse, any future surface)
    renders a **standing crisis-resource line whenever `showCrisisLine` is
    true** on the `getBoundAudioTrack` response — the flag is the contract, the
    player never inspects `tier` itself;
  - the *When It's Heavy* (tier 3) safety-review pass is **human**, not
    code-enforceable beyond the assertion.
- **Multi-voice dialogue episodes ARE v1** — as **pre-produced two-voice MP3s**
  (one file, one R2 `key`, player unchanged). Participants listed in `narrators`
  by billing order. **Runtime-segmented / stitched playback is out** (§10).

---

## 9. Surface

### 9.1 Active-kindling screen — `(protected)/kindling/`

Shape locked in [#273](https://github.com/xolace-official/xolace_app/issues/273)
(**Variant D — "Devotional + progress"**). Build the real screen from this spec;
the `prototype/kindling-273` branch is throwaway.

- Full-width **card per twig** to the right of a **continuous vertical rail**;
  icon node straddles the line.
- **Header:** a segmented progress bar on one row with an **"N of 3 tended"**
  count. Segments and the rail fill **accent** on `done`, go **grey** on
  `skipped`.
- **Twigs are an ordered list of independent tri-state rows** — `pending` /
  `done` / `skipped`. Order is the model's *suggested* sequence; completion is
  **not gated** on it (any twig, any time).
  - `done` → node fills + check, card dims to a "Tended" line.
  - `skipped` → row collapses to a struck-through title + "Not for you".
- **Per-twig affordances live in the card:** one primary action bottom-right
  (`Begin` / `Play` / `See who`) + a recessive **"Not for me"** text link
  bottom-left (the skip).
- **Empty state:** leaf glyph + one line — *"When a session leaves something to
  sit with, a little kindling shows up here."*
- **Loading state:** copy version — **"Setting up your kindling…"** over the
  standard app loader. This screen only ever waits on its own Convex query
  (generation runs in the background off `completeSession`; the Today row and
  notification appear **after** generation succeeds), and the same copy covers
  the window where the Today row is live but the query hasn't landed yet.

### 9.2 Entry points

- The **notification** deep-link (§10) → `(protected)/kindling/`.
- A **Today card row** while a kindling is `active`.
  - **Timing (resolves the #273 open item):** the Today row and the notification
    both appear **only after generation completes and the kindling is written**.
    There is no "generating" Today row. If the row is somehow visible before the
    query resolves (cold query), the "Setting up your kindling…" state covers it.
  - Today owns no generation rules of its own — it renders whatever the
    active-kindling query returns (`CONTEXT.md` "Today").

**"No new tab" (map decision 9) still holds for the active-kindling screen.** The
override in decision 19 applies **only** to the catalogue Browse tab (§9.3).

### 9.3 Browse tab — the catalogue

Locked in [#322](https://github.com/xolace-official/xolace_app/issues/322).
**A new third bottom tab, `Browse`** — order `Discovery → Browse → Connect` in
`AppTabs` (`src/components/app-tabs.tsx`, `NativeTabs`). SF
`square.grid.2x2` / `.fill`, md `grid_view`. **This overrides map decision 9's
"no new tab" clause and only that clause** (map decision 19).

Route subtree `(protected)/(tabs)/browse/`:

| Route | Screen |
|---|---|
| `index` | **Hub** — three entry buttons *Support audio · Music · Topics* + a **New** shelf (horizontally scrollable, ≤ 4 items, hidden entirely below 1, never padded). |
| `list` (`?family=support` \| `?family=music`) | **Per-family list** — paginated flat list of that family's `active` tracks. `useStablePaginatedQuery`, page size 30. |
| `topics` | **Topic grid** — one tile per `topic` with ≥ 1 `active` track in either family (grid of *topics*, not tracks). One combined button (topic is the shared axis). |
| `topic/[slug]` | **Topic screen** — both families for one topic, `All / Music / Support audio` segmented control (a segment disabled at 0), per-card **family glyph** ("spoken" vs "music") — the only screen where both families share a list, so the only place that distinction is solved. Episodes grouped by `series` client-side. |
| `player` (`?slug=…`) | **Dedicated player** — `requirePremium`. Artwork, title, attribution line (rendered when `licence.attributionRequired`), scrubber, play/pause, ±15 s. **No** queue / up-next / lyrics / AirPlay in v1. No inline play on list rows — a row tap opens the player. |

- **New shelf query (`getNewShelf`):** a pool of ≤ 12 `active` tracks —
  those with `newUntil > now` (newest window first), topped up with the most
  recently ingested — so the shelf never empties when every window has passed.
  Shows 4, rotated one step per day by a client-sent `day` (UTC days since
  epoch; refreshed on foreground). `day` is required for rotation because a
  Convex query result is cached until its data changes, so `Date.now()` alone
  never re-runs it. Old clients omit `day` and get the pool head. No new index
  (bounded catalogue, newest-first `take(1000)`). Reused for the Discovery
  strip (§9.5). No cron. See docs/bug-log.md 2026-10-17.
- **`getBrowseTracks`** — premium-gated read; mints R2 `url` + `thumbUrl` +
  `attributionText` per row. Browsable set is `active: true` only.

### 9.4 Free-user gate on Browse

All kindling — music included — is Xolace+ only. For a free user:

- Hub, family lists, topic grid, topic screens are **fully open to browse**.
- **Tapping a track row / CTA → the [#218](https://github.com/xolace-official/xolace_app/issues/218)
  paywall opens directly**, tagged `browse` trigger + the track's `slug`.
- The `player` route is `requirePremium` and **never renders** for a free user
  (one gate check, no half-loaded player).
- Track thumbnails carry a **small lock icon overlay** for free users.
- **Never an auto-presented sheet** (map decision 12 holds).

### 9.5 Discovery → Browse pointer

**One "From the library" strip on the Discovery tab** — the same
`getNewShelf` query (pool + daily rotation, §9.3) as the New shelf, horizontally scrollable, ending in **"See
all" → the Browse tab**. Recently-played (needs a play-history table) and
recommended-for-you (needs a ranker) are **fog** (§11).

### 9.6 A bound twig ↔ Browse

- A bound audio/music twig's card gets a recessive **"Browse more like this"**
  link → the per-family `list` filtered to the twig's `topic`.
- **It does not swap the bound track.** Playing from that affordance is one-off
  listening; `path_steps.params` is untouched. If the track is wrong, the user
  takes the twig's **"Not for me"** skip — that skip is the correction signal.
- **Playing a track in Browse is never twig completion.** `profileStats` advances
  only when a twig is completed from the kindling screen itself. Browse plays
  emit their own `browse_*` analytics as signal, not progress.

---

## 10. Notification

- A **new `notification_log.type` member: `kindling_ready`** — **not** a
  `reachUsed` value. Reach (`reachUsed`) is the return-nudge concept
  (`CONTEXT.md` "The two Reaches"); kindling is a distinct notification type.

  ```ts
  // convex/schema.ts — notification_log.type union, add:
  v.literal("kindling_ready"),
  ```

- **Single voice** — no `warm/direct/quiet` variants.
- Reuses the existing delivery infra **and the 30-day-dormancy suppression** — a
  user who hasn't opened the app in 30+ days is not nudged
  (`suppressedReason: "user_inactive"`), same as every other nudge.
- Fires **after** generation succeeds and the kindling is written (never before —
  §9.2). Suppressed if an escalation is active (`escalation_active`), consistent
  with existing rules.
- **Deep-links to `(protected)/kindling/`.**

---

## 11. Session-end contract

This spec defines **only** that session-end must expose:

1. a **slot** for the "your kindling is being set up" beat (premium users);
2. a **slot** for the free-user upsell (§12).

**The session-end screen redesign itself is out of scope** — a separate effort.
Kindling depends on those two slots existing; it does not specify their layout.

---

## 12. Free-user upsell

- **One line** in the kindling-pending slot on session-end → the existing
  Xolace+ paywall ([#218](https://github.com/xolace-official/xolace_app/issues/218))
  with a **kindling trigger-moment tag**.
- **Never an auto-presented sheet** on session-end (map decision 12).
- No compute for free users — no generation, no fallback, nothing
  ([ADR 0009](adr/0009-kindling-generation-is-premium-only-no-free-compute.md)).
- Emits `plus_upsell_shown` / `plus_upsell_tapped`.

---

## 13. Analytics

Event **names stay `path_*` / `browse_*` / `discovery_*`** (internal/schema
word); only user-facing copy says "kindling" / "Browse".

**Kindling lifecycle:** `path_generated`, `path_notified`, `path_opened`,
`step_started`, `step_completed`, `step_skipped`, `path_replaced`,
`path_dismissed`.

**Upsell:** `plus_upsell_shown`, `plus_upsell_tapped`.

**Browse** (from [#322](https://github.com/xolace-official/xolace_app/issues/322)):
`browse_opened`, `browse_family_opened` `{family}`, `browse_topics_opened`,
`browse_topic_opened` `{topic}`, `browse_track_opened` `{slug, family, from}`,
`browse_track_played` `{slug, family, from}` — `from ∈ hub-new | family-list |
topic | discovery-strip | twig-more-like-this`, `browse_paywall_shown` /
`browse_paywall_tapped` `{slug}`, `discovery_library_strip_tapped`.

---

## 14. Rollout

- Every schema change is **additive** — `supportNeed` optional, `paths` /
  `path_steps` / `audio_tracks` new tables, one new `notification_log.type`
  member, `emotional_metadata.supportNeed` optional. **No store-gap special
  handling.**
- Old clients simply don't render the session-end line, the Browse tab, or the
  kindling route. A backend running ahead of a shipped old UI is fine — nothing
  the old UI calls changes shape.
- The `narrators` field replaces the never-shipped `voiceSlug` on `audio_tracks`
  (the table is new) — no migration.
- `sessionCascade.test.ts` must be updated in the same change that adds `paths` /
  `path_steps` (the schema walk fails otherwise).

---

## 15. Verification (no deploy)

1. **Static:** `bunx convex codegen`, `bunx tsc --noEmit`, `bun expo lint` clean.
2. **Cascade:** `sessionCascade.test.ts` passes with `paths` / `path_steps` in
   `SESSION_CASCADE_TABLES`; a wipe/retention/account-deletion test deletes them.
3. **Trigger:** complete a session that classifies `supportNeed: "light"` as a
   Plus user (argent iOS sim) → a `paths` row + 3–4 `path_steps` appear; a free
   user gets none.
4. **Fallback:** force all twigs unbindable → no `paths` row, no notification.
5. **Binding:** an `audio_topic_*` twig resolves to a real `audio_tracks` slug;
   a bound `tier: 4` episode comes back from `getBoundAudioTrack` with
   `showCrisisLine: true` and the kindling player renders the crisis-resource
   line; every other tier returns `showCrisisLine: false`.
6. **R2:** `r2.getUrl` mints a playable URL; the audio hook refetches after the
   15-min expiry on resume.
7. **Notification:** `kindling_ready` row written after generation, deep-link
   opens `(protected)/kindling/`, dormancy suppression fires at 30 days.
8. **Ingest:** re-running the full manifest is a no-op on unchanged `sha256`; a
   `tier: 3` row without `safetyReviewedAt` is rejected.

---

## 16. Deferred — v2 notes (do NOT spec)

Map fog, carried forward explicitly:

- **Music curation process** — source is Pixabay Music; open: usable-track yield
  across the topic set, the review workflow, the "standalone distribution"
  legal read.
- **Podcast episode curation pipeline** — usable-episode yield per acuity tier
  under the five-beat / research-brief-first process; the *When It's Heavy*
  safety-review **workflow**; the standing *Misunderstood* crisis-resource footer
  as curation practice.
- **Runtime-segmented / stitched multi-voice playback** — v1 ships pre-produced
  dialogue MP3s only.
- **Time-of-day-fit matching** — needs `new Date()` bucketing in the binder
  (breaks "deterministic on Understanding fields only") and doubles the content
  cut per episode. Revisit when the catalogue has depth.
- **Dedicated series / podcast browse screen** — v1 groups by `series`
  client-side inside the [#322](https://github.com/xolace-official/xolace_app/issues/322)
  Browse surfaces; a series landing screen is a possible #322 amendment once real
  content shows topic-browse is too coarse.
- **Browse search** — graduates at ~150 browsable tracks.
- **Browse editorial shelves** (moods, charts) — add only if topic-browse proves
  too coarse.
- **Discovery "recently played"** — needs a play-history table (+ its own cascade
  classification).
- **Discovery "recommended for you"** — needs a catalogue ranker.
- **Episodic RAG in the generation input** — if selections feel shallow.
- **Twig outcomes wired into the Reflection Agent consolidation pass.**
- **RAG / smarter audio matching** beyond deterministic tag-match.
- **30-day stale-kindling `status: "expired"` sweep** — if it proves needed.
- **Past-kindlings / history surface.**

---

## 17. Charting decisions (map #268) — index

Decisions locked while charting or mid-map, expanded above. Kept here as a
cross-reference; the map is authoritative.

| # | Gist | Spec § |
|---|---|---|
| 1 | `supportNeed` graded field; crisis forces `none` | §1 |
| 2 | generation hook: `completeSession` sibling, premium only | §2.1 |
| 3 | standalone `convex/ai/paths/`, one Haiku call | §2.2 |
| 4 | deterministic downstream binding | §2.3, §8 |
| 5 | action *types* in `catalog.ts`; audio is a family | §3.1 |
| 6 | fallback: drop unbindable, ship if ≥ 2, else nothing | §5 |
| 7 | one active kindling; new session → `replaced` | §6 |
| 8 | `paths` + `path_steps`; both in `SESSION_CASCADE_TABLES` | §7 |
| 9 | route `(protected)/kindling/`; no new tab (**19 overrides for Browse only**) | §9.1–9.2 |
| 10 | new `notification_log.type`, single voice, dormancy suppression | §10 |
| 11 | session-end contract = two slots only; redesign out of scope | §11 |
| 12 | upsell = one line → #218 paywall; never an auto sheet | §12 |
| 13 | `path_*` / `browse_*` analytics | §13 |
| 14 | additive rollout, no store-gap handling | §14 |
| 15 | music self-hosted + hand-curated, no streaming API | §3.2 |
| 16 | music is a standalone action type + its own browse surface | §3.1, §9.3 |
| 17 | music binds on the same topic + tag axis; Plus only | §2.3, §9.4 |
| 18 | storage volume 200–400 files (superseded #270 numbers) | §3.2, §3.4 |
| 19 | catalogue browse is a new `Browse` bottom tab | §9.3 |
| 20 | podcast episodes are a v1 content family | §8 |
