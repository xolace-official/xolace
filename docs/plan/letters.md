# Letters: handoff spec

> Handoff spec from the wayfinder map
> [Letters to strangers](https://github.com/xolace-official/xolace/issues/743). The
> experience and the policy were settled in that map's tickets
> ([#744](https://github.com/xolace-official/xolace/issues/744)–[#750](https://github.com/xolace-official/xolace/issues/750)),
> linked inline; read them for the reasoning. This file holds what to build: the Convex
> contract (redesign row **B12**) and how the mobile app consumes it (row **S21**).
> Web, desktop and the CLI read the same contract later; the admin UI is a placeholder,
> so B12 ships admin functions only.
>
> **Status: decided.** The owner settled #743's five open items on 19 November 2026
> (§"Owner's decisions"); everything else follows the settled tickets. Ready to build in
> the slices at the end.

`porting/…` paths are in the redesign handoff (`design/handoff/porting/` in the prototype
repository); "open question N" is `porting/open-questions.md`.

Domain terms (root `AGENTS.md` → Glossary): **letter**, **sender**, **recipient**,
**received** (placed with the recipient, read or not), **acknowledge**. Never "message",
"note", "DM" or "delivered" (that is outreach's word). A letter push is a
**notification**, not outreach.

---

## Problem

Letters' UI is on `dev` (S20: #849, #853 and the PR between them), running on fixtures and
an in-memory store behind one hook module,
`apps/mobile/src/features/letters/use-letters-data.ts`. A send goes nowhere and no one
receives anything. `dev` can't be released until letters run on a real contract
(`porting/phasing.md` §4.1: no `letters` flag).

## Solution

1. **A `convex/letters/` domain** with six tables: the letters themselves, one row of
   letters state per person, sender–recipient blocks, review items, strikes, and a
   one-row `letter_stats` for the invite flag (decision C).
2. **A check at send** inside a client action: intake's crisis recipe
   (`checkWordsSafety`), a new letters classifier (one Haiku call), and contact/URL
   regexes shared with Stream's blocklist. A letter is never placed unchecked.
3. **Matching** at send and in an hourly sweep, over a pool of opted-in recipients kept
   ready by the session pipeline, so a match is a few indexed reads, not a scan.
4. **Three pushes** through one letters push mutation, on the existing push path, gated
   by a new letters switch and held by the quiet window.
5. **Reports, hides, strikes and pauses**, a `source: "letter"` escalation, and
   `convex/admin/letters.ts` for a minimal review queue.

---

## Implementation decisions

### 1. Tables

All new, so additive. Keyed on `emotional_profiles` (the pseudonymous side), like
every content table. Field names below are the contract; the build may add indexes.

**`letters`**: one row per letter that was stored (passed, or couldn't be checked, or
held as hostile). Fixable and at-risk letters are never stored (#750).

| Field | Type | Notes |
|---|---|---|
| `senderProfileId` | `optional(id)` | Optional so a deleted sender's received letter can stay with its recipient (§10) |
| `text` | `string` | Trimmed, 40–500 characters |
| `aim` | `optional(letterAim)` | The sender's "For"; absent = anyone. Steers matching only; never returned to a recipient |
| `language` | `string` | From the check (`"en"` at launch) |
| `status` | `"unchecked" \| "waiting" \| "received" \| "held" \| "returned"` | `unchecked`: the check couldn't finish, re-check pending. `held`: hostile, kept for review, never placed. `returned`: not placed within 30 days, or a late re-check failed (decision C) |
| `createdAt` | `number` | When it was sent |
| `checkedAt` | `optional(number)` | When it passed the check: the FIFO key and the start of the 72 h aim window |
| `recheckCount` | `optional(number)` | Background re-checks spent |
| `recheckDueAt` | `optional(number)` | Unchecked letters only: when the next re-check is due. The sweep runs one itself once it is `RECHECK_OVERDUE_MS` late (§5.4) |
| `recipientProfileId` | `optional(id)` | Set at placement |
| `receivedAt`, `openedAt`, `acknowledgedAt`, `hiddenAt` | `optional(number)` | The recipient's side. Hide is reversible (`hiddenAt` cleared) |
| `reportedAt` | `optional(number)` | Gone from the recipient at once; kept for review |
| `senderSeen` | `optional("received" \| "acknowledged" \| "returned")` | The latest status the sender has seen (`markSeen`) |
| `textHash` | `optional(string)` | Held letters only: SHA-256 of the trimmed text, so the same words are refused again |

Indexes: `by_sender_created` `[senderProfileId, createdAt]` (Sent list, the daily cap),
`by_sender_status` `[senderProfileId, status]` (three waiting), `by_recipient_received`
`[recipientProfileId, receivedAt]` (For you), `by_status_checked`
`[status, checkedAt]` (the FIFO pool, expiry, re-checks), `by_sender_hash`
`[senderProfileId, textHash]`, `by_received` `[receivedAt]` (the invite backlog).

**`letter_profiles`**: one row per person who has answered the offer or sent a letter.
No row = opt-in `unset`, never sent.

| Field | Notes |
|---|---|
| `emotionalProfileId` | Index `by_profile` |
| `optIn` | `optional("yes" \| "no")` |
| `optInAt`, `locale` | When they answered; the device locale sent with Yes (language fallback, #749) |
| `language` | `optional(string)`: from their sessions, once the classifier writes it (slice 6) |
| `pool` | `"ready" \| "out"`: whether matching may pick them now (§5). Always `out` unless `optIn` is `yes` |
| `poolCheckAt` | When `pool` may next change on its own (freshness ends, the 7-day rest ends). Index `by_pool_check` |
| `aim`, `band`, `metadataAt` | Copied from their latest session's metadata when it's eligible (§5); cleared when not, and on opt-out |
| `lastReceivedAt` | `0` until their first letter, so never-received sorts first |
| `tiebreak` | A random number, redrawn at each placement: the random last rank |
| `unopenedLetterId` | The letter waiting to be opened; it blocks another |
| `lastSentDay` | The sender's local day (`YYYY-MM-DD`) of their last stored letter, held ones included: the 1-a-day cap, which a withdraw doesn't give back |
| `pausedUntil`, `pausedBy` | A silent pause, `"strikes"` or `"admin"`. It ends at `pausedUntil` on its own, or earlier when an admin lifts it |

Matching indexes: `by_pool_aim` `[pool, language, aim, band, lastReceivedAt, tiebreak]`
and `by_pool_band` `[pool, language, band, lastReceivedAt, tiebreak]`.

**`letter_blocks`**:
`{ recipientProfileId, senderProfileId, createdAt, cause: "hide" | "report" }`, indexes
`by_pair` and `by_sender` (account deletion). That sender is never matched to that
recipient again (#750). Unhide doesn't remove it.

**`letter_reviews`**: what a person may read (#750: only reported letters and held
ones). `{ letterId, kind: "held" | "report", reason?, reporterProfileId?, createdAt,
state: "open" | "confirmed" | "dismissed", decidedAt?, decidedBy? }` (`decidedBy` is the
admin's Clerk subject). `reason` is the report's: `"unkind" | "selling" | "private" |
"other"` (required, open question 30). Indexes `by_state_created`, `by_letter`,
`by_reporter` (a reporter's deletion or wipe) and `by_decided` (reviewed text's 30 days).

**`letter_strikes`**: `{ senderProfileId, at, cause: "held" | "report", reviewId }`,
indexes `by_sender_at` and `by_at` (the 120-day cleanup). No text.

**`letter_stats`**: one row, `{ invite: boolean, updatedAt }`, written by the hourly sweep
(decision C) so `status.get` reads one document. No row = `invite: true`.

**Widened, additive:**

- `escalation_events.source`: add `"letter"` to `escalationSourceValidator`. The row has
  no `sessionId` and stores trigger evidence only, never the letter (#750).
- `age_declarations.surface` and `age.declarations.declare`'s `surface` arg: add
  `"letters"` (#749).
- `consent_records.consentType` (the schema's union): add `"letters_receive"`. The opt-in
  is consent (#748): Yes appends a `granted` record, and a No that withdraws a Yes a
  `revoked` one (a first No consents to nothing). Only `letters.optIn.set` writes them:
  `consentTypeValidator`, the arg of the generic `consent.grant` / `consent.revoke`, does
  **not** gain the literal, so those refuse `letters_receive` and a client can't record
  a letters consent that `letter_profiles.optIn` doesn't match.
- `preferences.notifications.letters`: `optional(boolean)`, absent = on, like `chat`.
- `admin_audit_log.action`: add `"letter_viewed"`, with an optional `letterReviewId`.
  `targetClerkUserId` becomes optional: a letter whose sender deleted their account has
  no one to name. Existing rows and `viewUserOutreach` still set it.
  - **Kept 1 year** (`LETTER_VIEW_AUDIT_KEEP_DAYS`, 365), then deleted by the daily
    `letters.retention.run` through a new `by_action_at` index. Long enough to answer
    "who read this person's words" for any review the person could still ask about; the
    row holds no text.
  - **On the sender's account deletion** their `letter_viewed` rows (`by_target`) lose
    `targetClerkUserId`, so the log keeps which admin opened which review and when, but
    no longer names a deleted person. A data wipe leaves them: the wipe doesn't remove
    the account, and the log records what admins did, not what the sender said.
  - Not built yet (slice 5 follow-up). `outreach_viewed` rows have no retention either;
    that is outreach's to settle.

### 2. A letter's life

```
send ─► check ─┬─ pass ───────────────► waiting ─► placed: received ─► opened ─► acknowledged
               ├─ unavailable ─► unchecked ─(re-check passes)─┘     │            hidden / reported
               ├─ held ─► held (review, strike; never placed)       └─► 30 days unplaced ─► returned
               └─ fixable · risk · lang ─► nothing stored
waiting / unchecked ─► withdraw ─► row deleted
```

What each side sees: the sender sees `waiting` for `unchecked` and `waiting`, then
`received`, then `acknowledged`. A held letter never shows in Sent (the sender saw "This
letter can't be sent" and kept their words). The recipient sees a letter from
`received` on, until they report it.

### 3. The check at send

`letters.send` is a client **action** (the UI waits 1–8 s on "Reading it over…").

1. **Gate** (internal query, no model spend): the caller is an adult (`requireAdult`,
   `"ask"`), has finished a session (`sessionCount ≥ 1`), and isn't at a cap. Caps are
   checked here and again in the store step, so two devices can't both use the last slot.
   A profile rate limit `letterCheck` (named constant, ~20 checks a day) bounds model
   spend on repeated fixable sends; past it the action throws `rate_limited` (the UI's
   "keep the words, Try again" path).
2. **Same held words?** If the trimmed text hashes to one of this sender's held letters,
   answer `held` again with no model call and no second strike.
3. **Regexes** (pure, no spend): contact details and URLs from the shared helper
   (`convex/lib/contactPatterns.ts`, §3.1). A hit is fixable, but **both halves of
   step 4 still run**: a phone number never hides a sender at risk, and a hostile letter
   with a link in it is held, not handed back to be fixed.
4. **In parallel, each with its own deadline:**
   - `checkWordsSafety(text)` from `ai/intake/read.ts` (phrase floor, OpenAI
     moderation, the Haiku safeguard; 8 s);
   - the letters classifier (`ai/letters/check.ts`, one Haiku call, 8 s): returns
     `{ hostile, fixable: category | null, language }` (off-topic is one of the fixable
     categories). The letter goes inside tags the prompt calls data to judge, never
     instructions, and any tag in the text is neutralised first.

   A half that throws counts as unavailable for that half; `send` never rejects
   because a check call failed.
5. **Decide**, first that applies:
   - safeguard `elevated` or `crisis` → **`risk`**: an escalation row (`source:
     "letter"`, the verdict's `peak` as evidence, never the text), nothing stored.
   - classifier `hostile` (harassment, hate, sexual content, threats), or the safety
     half's moderation rejecting the text on content policy → **`held`**: stored
     `held` with `textHash`, a `letter_reviews` row, a strike (§8).
   - classifier `language` not in `LETTER_LANGUAGES` (`["en"]`) → **`lang`**.
   - a `fixable` category, from a regex hit (step 3) or the classifier →
     **`fixable`** with that category's fixed line. A regex hit decides this even
     when the classifier couldn't answer.
   - the safeguard or the classifier unavailable → **`unavailable`**: stored
     `unchecked`, re-checked in the background (§5.4). Reads to the sender as pass.
     Either half, not only both: one guards the sender, the other the reader, and
     #750 places nothing a check didn't finish on.
   - otherwise → **`pass`**: stored `waiting`, then a match is tried at once (§5).
6. **Store** (internal mutation): re-check the caps (a lost race answers `limit`), insert,
   set `lastSentDay`, capture analytics. A **held** letter skips the caps (it's kept for
   review whatever else was sent) but still sets `lastSentDay`, so a sender adds at most
   one held letter a day to the review queue, paused or not, and then meets the same
   `limit: today` as anyone. The same held words twice, even from two devices at once,
   are one row and one strike.

`send`'s args: `{ text: string, aim?: letterAim }`. `returns` (the S20 `SendOutcome`,
as a union validator):

```ts
| { kind: "pass" } | { kind: "unavailable" }
| { kind: "fixable"; line: string }
| { kind: "risk" } | { kind: "held" } | { kind: "lang" }
| { kind: "limit"; reason: "today" | "three" }
```

Also refused with a `ConvexError`: `age_required` / `age_restricted` (the UI shows
Connect's existing age-gate sheet), `no_session` (Write isn't offered before a first
session, so this is a guard), `invalid_letter` (length).

#### 3.1 Contact and URL patterns

`convex/lib/contactPatterns.ts`: pure, client-safe, no Stream types. Each pattern is a
`{ source, flags }` pair (JS has no inline `(?i)`, which Stream's Go regexes use), plus
a URL pattern Stream gets from its own `url_detection_v1`. `lib/streamSetup.ts` builds
`CONTACT_LEAK_BLOCKLIST.words` from the helper (adding `(?i)` where `flags` has `i`), so
`streamSetup.test.ts` proves the Stream list doesn't change. Letters call
`contactLeakIn(text)` / `urlIn(text)`.

#### 3.2 The letters classifier

`ai/letters/check.ts` (prompt, parser, version constant; pure) and the action-side call
beside it. A letter is a new artifact type, so this is a new call under the
constitution, not a re-derivation; its verdict never touches Understanding or Memory.
It keeps the DM classifier's questions (harassment, spam/solicitation, contact details)
and adds #750's: medical or medication advice, preaching or religious pressure,
minimising, graphic detail, forced positivity, identifying details (names, schools,
towns, employers), and whether the text is a letter to a reader at all.

- **Fixable categories** and their lines are a fixed, human-written table
  (`letters/lines.ts`), e.g. `contact` → "Letters can't carry contact details, so no
  one can be found through one. Could you take them out?". The model picks a category;
  it never writes copy the sender sees. (Filled in here; see the last section.)
- **A parse failure** counts as unavailable for this half, never as a pass or a flag.
- **Evals:** `ai/prompts/__evals__/lettersCheck.eval.test.ts` on the existing harness,
  with a fixture set per category, kind letters that must pass (grief, faith mentioned
  in passing, "it gets better" said gently), and contact attempts the regexes miss.
  Runs only with `RUN_EVALS=1`.

### 4. Client functions

Every client function: `requireAuth`, validators on `args` and `returns`, ownership
checked on every letter it touches, indexed reads only. No function returns the other
side's identity, a date, why a letter was placed, or its aim (`porting/backend.md` §2.3,
"never receive"). A letter that isn't the caller's reads as not found, exactly like a
letter that doesn't exist.

| Function | Kind | Args | Returns |
|---|---|---|---|
| `letters.status.get` | query | — | `{ optIn: "unset" \| "yes" \| "no", writeLimit: "today" \| "three" \| null, unopenedId: Id<"letters"> \| null, invite: boolean, lastSentDay: string \| null }` (`invite`: decision C) |
| `letters.send.send` | action | `{ text, aim? }` | `SendOutcome` (§3) |
| `letters.sent.list` | query | — | `{ id, line, status: "waiting" \| "received" \| "acknowledged" \| "returned", seen }[]`, newest first, at most 50 |
| `letters.sent.dismiss` | mutation | `{ id }` | `null`; a returned letter leaves Sent and its row is deleted |
| `letters.sent.withdraw` | mutation | `{ id }` | `"ok" \| "received"` (a letter already gone reads `"ok"`) |
| `letters.sent.markSeen` | mutation | `{ ids }` (≤ 50) | `null` |
| `letters.received.list` | query | — | `{ id, text, opened, acknowledged, hidden }[]`, newest first, at most 100, hidden included, reported never |
| `letters.received.get` | query | `{ id: string }` | the same shape, or `null` when gone, not the caller's, or not a letter id (the server normalizes it) |
| `letters.received.open` | mutation | `{ id }` | `null`; clears `unopenedLetterId`, idempotent |
| `letters.received.acknowledge` | mutation | `{ id }` | `null`; once only, idempotent; pushes the sender |
| `letters.received.hide` / `unhide` | mutation | `{ id }` | `null`; hide also writes the block |
| `letters.received.report` | mutation | `{ id, reason }` | `null`; the letter leaves the caller at once |
| `letters.optIn.set` | mutation | `{ choice: "yes" \| "no", locale?, promptVersion }` | `null`; Yes needs an adult (`age_required` / `age_restricted`) |
| `letters.settings.getPush` | query | — | `boolean` (absent = on) |
| `letters.settings.setPush` | mutation | `{ on }` | `null` |

Notes:

- **`writeLimit`** is computed on the sender's local day (`profileTimezone`, as streaks
  do): `today` if `lastSentDay` is today (held letters count), else `three` if three
  letters are `waiting` or `unchecked`. A pause never shows here (#750: silent).
- **`lastSentDay`** (`YYYY-MM-DD` in the sender's timezone, or `null`) is returned because
  Convex doesn't re-run a query when the clock passes midnight: the client compares it
  with its own local day and treats `writeLimit: "today"` as lifted once they differ.
- **`invite`** is always present (`true` until the sweep first writes `letter_stats`).
- **`unopenedId`** is only set while `optIn` is `yes`, matching S20's `unopenedOf`.
- **`line`** is cut on the server with the same rule as `openingLine` (first paragraph,
  ≤ 46 characters at a word), so the Sent list never ships the whole text.
- **`seen`** is `status === "waiting"` or `senderSeen === status` (`senderSeen` also takes
  `"returned"`).
- **The 5 s undo stays on the client** (S20 holds Acknowledge and Hide for 5 s before
  calling), so the server needs no undo and the sender's push never waits.
- **Turning receiving off** (`choice: "no"` after `"yes"`): the person leaves the pool
  at once and their copied metadata fields are cleared. Letters already received stay
  readable.

### 5. Matching and sweeps

#### 5.1 The pool

A recipient's `letter_profiles` row is kept current by `letters.pool.refresh` (internal
mutation), scheduled from:

- the session pipeline, right after it writes or refines a session's
  `emotional_metadata` (`emotionalMetadata.ts`; one `runAfter(0)` line, only for
  profiles with a letters row);
- `optIn.set`, `open`, placement, a data wipe, and the hourly sweep (for rows whose
  `poolCheckAt` has passed).

`refresh` reads the latest metadata and sets `pool: "ready"` only if every #749/#750
hard filter that doesn't change by the minute holds:

- `optIn` is `yes`, adult confirmed (`effectiveAgeStatus` is adult);
- a language: `language`, else `locale`'s language;
- latest metadata at most `METADATA_FRESH_DAYS` (14) old;
- that session's `safeguardLevel` isn't `elevated` or `crisis`, its themes include none
  of `trauma`, `abuse`, `neglect`, `body-image`, and it wasn't tap-only (the same rules
  as `lib/xolacerSuggestion.ts`, shared from there, not copied);
- no letter in the last `RECIPIENT_REST_DAYS` (7), and no `unopenedLetterId`;
- the account isn't deleted, being purged, or mid-wipe.

`aim` is the letter aim the metadata maps to (the pure table `letters/aims.ts`, §5.5),
`band` is `heavier` when `intensity ≥ HEAVIER_FROM` (6), else `lighter`. `poolCheckAt` is
the earliest of freshness ending and the 7-day rest ending.

#### 5.2 Picking a recipient

`letters.match.place({ letterId })` (internal mutation). A letter in its aim window
(`checkedAt` + `AIM_WINDOW_HOURS`, 72) reads `by_pool_aim` with its aim, `heavier`
first, then `lighter`; after the window (or with no aim) it reads `by_pool_band`,
`heavier` first. Candidates are read lazily in index order (longest since a letter, then
`tiebreak`), at most `CANDIDATES_TRIED_MAX` (100) per band, and each is checked live:

- not the sender, no `letter_blocks` row for the pair (turned away **for this sender**);
- may still receive at all (`mayReceive`: opted in, adult, the account active and not
  being deleted or wiped), not inside their quiet window now (`quietWindowEndsAt`,
  `outreach/quietWindow.ts`; skipped, not reserved, #749), and no open acute or
  escalation-derived follow-up (`follow_up_cards` indexes) (turned away **for
  themselves**).

The first that passes gets the letter: `status: received`, `recipientProfileId`,
`receivedAt`, the recipient's `unopenedLetterId`, `lastReceivedAt`, a new `tiebreak`,
`pool: out`, and both pushes are scheduled (§6). No candidate: the letter stays
`waiting`. A paused sender's letters are skipped before any read (#750: silent).

**Turned away for themselves means out of the pool until it clears**, so the next letter
doesn't read them again and a pool head of sleepers can't starve everyone behind it.
After the walk (never during it, so no row moves under the index), each such candidate
is refreshed: `pool: out` with `poolCheckAt` at the end of their quiet window, or
`FOLLOW_UP_LOOK_AGAIN_MS` (1 h, one sweep) later while a hard follow-up is open, capped
by freshness ending. Someone turned away only for this sender stays `ready` for others
and is stepped past. Each try is about ten reads; a placement runs in its own mutation.

#### 5.3 The hourly sweep

`crons.ts` → `letters.sweep.run` every `SWEEP_EVERY_HOURS` (1). `run` only starts a
chain of internal mutations, each working in bounded pages (`SWEEP_BATCH`, 50) that
schedule their own next page, and starting the next step when done:

1. **`refreshDue`**: pool rows whose `poolCheckAt` passed. A refresh always moves
   `poolCheckAt` on, so the walk ends.
2. **`placeWaiting`**: `waiting` letters by `checkedAt` (FIFO, #749), through a keyset
   cursor (the last `checkedAt` and id). A letter waiting `LETTER_WAIT_DAYS` (30) since
   it passed is **returned** (decision C); returns and skips are cheap and run a page to
   a mutation. A **placement reads the pool, so each runs in a mutation of its own** and
   the next is scheduled after it. Once a letter finds no one, the rest of this sweep
   skips its language (inside an aim window, its language and aim): the next letter
   would read the same pool.
3. **`uncheckedDue`**: `unchecked` letters. One unchecked `LETTER_WAIT_DAYS` after it was
   written is returned; otherwise, once its `recheckDueAt` is `RECHECK_OVERDUE_MS`
   (10 min) past (the scheduled re-check didn't land, or failed before it wrote), the
   sweep starts one itself and moves `recheckDueAt` on, at most `RECHECK_SWEEP_MAX` (25)
   a sweep: during a classifier outage every unchecked letter is due at once.
4. **`invite`**: works out decision C's flag and writes `letter_stats`.

Two sweeps overlapping only repeat work: every write re-reads the row it changes.

#### 5.4 Re-checks

An `unchecked` letter is re-checked by `letters.check.recheck` (internal action) at
growing intervals (`RECHECK_DELAYS_MS`: 5 min, 30 min, 2 h, then each sweep), with the
same check as send minus the parts that need the sender in the room. Each attempt sets
`recheckDueAt` to when the next is due, which is how the sweep (§5.3) finds one that
never ran. It is never placed unchecked. A late `pass` makes it `waiting`; a late `risk`
writes the escalation and deletes the letter; a late `held` holds it (review, strike); a
late `fixable` or `lang` is decision C's "returned" path. An unchecked letter still
unchecked `LETTER_WAIT_DAYS` (30) after it was written is returned too.

#### 5.5 Aims

`letterAim` is a closed union matching the writing screen's "For" list. The UI's
families are stand-ins ("the board's stand-ins", `copy.ts`), so the build fixes the keys
and their mapping in `letters/aims.ts` in one place, e.g. `anxiety` (anxiety, fear,
overwhelm, stress), `loneliness` (loneliness, not-belonging; theme `isolation`), `grief`
(grief; theme `loss`), `sleep` (theme `sleep`; exhaustion), `low` (sadness,
hopelessness, numbness, demotivation). The UI's "Anyone" sends no aim.

### 6. Pushes

Three pushes (`porting/backend.md` §2.3), all through `letters.push.send` (internal
mutation), modelled on `chatNotifications.send`: `sendPushToProfile` directly, not
outreach's `enqueue` (the glossary: a letter isn't outreach, and its pushes aren't Xolace
reaching out). It honours `notifications.enabled` and `notifications.letters !== false`,
and the quiet window: inside it, the same mutation is scheduled for `quietWindowEndsAt`
and runs its checks again then (open question 31: quiet hours decide). With no
`preferences` row it sends nothing, as chat does. The pushes use the gentle Reflections
channel and sound (`NUDGE_NOTIFICATION_SOUND`). Its args are `{ to, type, letterId }`,
`letterId` required: every letter push is about one letter, and re-reading it is how a
push drops itself. It is the one place that knows how a letter push goes out, so moving
letters onto outreach later changes only its body (owner decision E).

| `type` | To | When | Copy (`LETTERS.push`, open question 28) | `data` |
|---|---|---|---|---|
| `letter_for_you` | recipient | placed | "Someone wrote you a letter" | `{ type, letterId }` |
| `letter_received` | sender | placed | "One of your letters was received" / "Xolace placed it with someone it fits." | `{ type }` |
| `letter_acknowledged` | sender | acknowledged | "Your letter reached someone" / "They acknowledged it." | `{ type }` |

At send time each push re-reads the letter and drops itself if it no longer applies
(the recipient already opened it, the letter was reported, the sender deleted their
account). Ids only, never text. The client routes are S20's
(`apps/mobile/src/lib/notification-tap.ts`).

**The two pushes at placement don't go out together.** The sender's Sent row turns
`received` the moment a letter is placed; if the recipient's phone buzzed at that moment
too, a sender beside someone they know (likely at launch, when the team and beta users
are much of the pool) could tell who received it. So `letter_for_you` is scheduled a
random `RECIPIENT_PUSH_DELAY_MS` (15 min to 2 h) after placement, on top of any quiet
window; `letter_received` goes at once. Letters aren't urgent, and the letter is in For
you from placement, so opening the app finds it sooner. Acknowledge is left as is: it
flips the sender's row at once whatever the push does, and linking it needs watching
the recipient's screen, not their phone.

### 7. Opt-in, age and the push switch

- **Opt-in** lives in `letter_profiles.optIn` (what matching reads) **and** appends a
  `consent_records` row (`letters_receive`, `granted` / `revoked`, with
  `promptVersion` as the language version): the offer's line says how recipients are
  chosen, which makes Yes consent to that use (#748, invariant 6).
- **Age:** Yes and every send call `requireAdult(…, "ask")`. S21 opens Connect's existing
  age-gate sheet on `age_required`, declaring with `surface: "letters"`.
- **The letters push switch** is `preferences.notifications.letters`, read and written
  through `letters.settings` so the S20 seam keeps its shape.

### 8. Reports, hides, strikes, pauses, escalation

- **Hide** (`hiddenAt`) writes a `letter_blocks` row; **unhide** clears `hiddenAt` only.
- **Open, hide and report** each free the recipient's unopened slot if this letter held
  it: a hidden or reported letter mustn't keep someone out of the pool.
- **Report** sets `reportedAt`, writes a block and a `letter_reviews` row (`report`,
  with the reason). Never a strike on its own. The sender is never told.
- **Strikes:** a held letter (at once) or a confirmed report (when an admin confirms)
  writes a `letter_strikes` row. `STRIKES_TO_PAUSE` (2) within `STRIKE_WINDOW_DAYS` (90)
  sets `pausedUntil = now + PAUSE_DAYS` (30), `pausedBy: "strikes"`. Silent.
- **Dismissing a held review** deletes the strike it earned. A pause that strike caused
  isn't lifted with it: it runs to its `pausedUntil` unless an admin lifts it, and the
  letter is still never placed.
- **Escalation:** a `risk` outcome writes `escalation_events` through
  `raiseEscalation` with `source: "letter"` (one per profile per day, the channel dedupe
  that already exists). It waits for the escalation review the outreach work plans; no
  letters-specific alert.

### 9. Admin functions (`convex/admin/letters.ts`)

Admin functions only; `apps/admin` has no screen yet (its own later work). An admin
never sees who wrote a letter or who received it: actions take a review id and the
server finds the sender.

| Function | Kind | Does |
|---|---|---|
| `listQueue` | `adminQuery` | Open reviews, oldest first, paginated: `{ reviewId, kind, reason?, createdAt, priorStrikes }`. No text |
| `openReview` | `adminMutation` | The letter's text for one review; writes an `admin_audit_log` row (`letter_viewed`) |
| `decide` | `adminMutation` | `{ reviewId, decision: "confirm" \| "dismiss" }`. Confirm on a report adds a strike (and may pause) |
| `pauseSender` / `liftPause` | `adminMutation` | By `reviewId`; `liftPause` also takes `listPauses`' `pauseRef`. `pausedBy: "admin"` |
| `listPauses` | `adminQuery` | Active pauses: `{ pauseRef, until, pausedBy, strikes }` (`pauseRef` is the `letter_profiles` row's id: stable across calls, so `liftPause` can take it, and never the person's `emotional_profiles` id) |

### 10. Deletion, wipe and retention

As decided in B (§"Owner's decisions"), in `convex/letters/erasure.ts` and
`convex/letters/retention.ts`: one step in `jobs/accountDeletion.ts`, one section in
`jobs/dataWipe.ts`, the retention cutoff applied to each person's own side in
`purgeProfilePastCutoff` (the nightly job and Settings' "Delete them"), and a daily
`letters.retention.run` for reviewed text and old strikes.

One `letters` row is both the sender's Sent row and the recipient's letter, so each side
lets go of its own end: a received letter loses the departing side's profile id, and the
row is deleted once neither side holds it and no review is open. How the build reads B:

- **A recipient's deletion cuts their letters** rather than deleting the rows, so the
  sender's Sent row keeps its status. To the recipient they're gone either way.
- **A sender's deletion deletes a reported letter outright**, with its reviews: its
  recipient lost it when they reported it.
- **A wipe keeps strikes, a pause, and other people's blocks of the sender.** B says a
  wipe is the same as deletion; following it would let a paused sender wipe to lift the
  pause, or reach a recipient who hid them again. Those rows record what others chose
  about the sender, not what the sender said. The owner confirmed this (19 November
  2026).
- **Retention cuts a letter still under review from its sender** instead of deleting it,
  so an admin can still decide; that review can no longer strike them.
- **A reported letter's text outlives its review's 30 days while its sender has an
  account**: it's still their Sent row. Only the review goes; the letter goes with its
  sender.
- **Settings' retention count** ("N sessions would go") still counts sessions only; its
  purge deletes letters too.

### 11. Analytics

As decided in D (§"Owner's decisions"). Server-side PostHog captures in the mutations that
see each event, as `age_declared` does (a failed capture never rolls back the write).
Never the text, a letter id, or anything that links a sender's event to a recipient's.

### 12. Store-gap notes

- Every table and function is new; every widening is a new literal or optional field.
  Today's store app calls none of it, so nothing it calls changes shape.
- `escalationSourceValidator` gains `"letter"`: readers that switch on `source` must
  treat an unknown value as "not session". The build greps every reader.
- `age.declarations.declare` gains a literal on an existing arg: old clients still send
  `"xolacer_chat"`.
- `preferences.update`'s `notifications` arg gains an optional `letters: boolean`,
  merged like the other flags; old clients never send it. The letters screen's own
  switch is `letters.settings.setPush`.
- The pipeline hook (§5.1) is a scheduled call; it changes nothing a client reads.
- Scheduled functions (pushes held for the quiet window, re-checks) keep accepting the
  args they were scheduled with.

### 13. How S21 maps S20's seam

S21 replaces the bodies in `use-letters-data.ts` and deletes `letters-memory.ts`; the
hook names, returns and call signatures stay, except where marked.

**Anonymity requirement for S21:** analytics must not carry a letter id either. The root
layout sends `posthog.screen(pathname)` on every route change
(`apps/mobile/src/app/_layout.tsx:155`), and `letters/read/[id]` puts the id in the
pathname, which would tie a letter to the recipient's PostHog person. Letters routes
report the route pattern (`/letters/read/[id]`), not the filled-in pathname; S21 adds a
test that no captured screen name contains a letter id.

| S20 seam | Contract | Change in the seam |
|---|---|---|
| `useLettersStatus` | `letters.status.get` | `unopenedId` is an `Id<"letters">` (a string on the client). **Gains** `invite` (decision C: `endCardOffer` offers the session-end write card only while it's `true`) and `lastSentDay` (§4: compare it with the device's local day to lift `writeLimit: "today"` after midnight) |
| `useSentLetters` | `letters.sent.list` | — |
| `useReceivedLetters` | `letters.received.list` | — |
| `useReceivedLetter(id)` | `letters.received.get` | Pass the route param as it is: the server normalizes it, and a bad id reads `null` |
| `useLettersPush` / `setPush` | `letters.settings.getPush` / `setPush` | — |
| `send(draft)` | `letters.send.send` | `forWho: LetterFor` becomes `aim?: letterAim` (Anyone → absent); the UI's "For" list takes the contract's keys and labels. A network error or `rate_limited` throws (keep the words, Try again) |
| `withdraw`, `markSeen`, `open`, `acknowledge`, `hide`, `unhide` | the mutations above | A letter that's gone (reported from another device, say) refuses with `ConvexError` `letter_not_found`: drop the row, don't show an error |
| `report(id, reason)` | `letters.received.report` | — |
| `setOptIn(choice)` | `letters.optIn.set` | **Changes:** sends `locale` and `promptVersion`, and handles `age_required` / `age_restricted` by opening Connect's age gate (`surface: "letters"`). Send handles the same errors. `promptVersion` is a client constant beside the offer's copy in `features/letters/copy.ts` (`LETTERS_OFFER_VERSION`, like `TELEGRAM_OUTREACH_CONSENT_VERSION`), bumped whenever the offer's wording changes |
| (none) | `returned` (decision C) | `SentStatus` gains `"returned"`: its row says "Not placed. No one it fit came along this time." and can be dismissed (`letters.sent.dismiss`, a mutation added with decision C). It frees a waiting slot. `LettersCalls` **gains** `dismiss: (id: string) => Promise<void>` |

---

## Owner's decisions

#743 left five items open. Each had a recommendation and one alternative. **The owner took
every recommendation (19 November 2026)**, with E's pushes kept movable to outreach.

### A. Sparks and achievements

**Decided (the recommendation):** sending a letter earns one achievement, **First letter**
(10 sparks, the smallest size), when a first letter is stored as `waiting` (the check
passed). Nothing else: a letter doesn't count as showing up, there's no ladder (5, 10, 25
letters), and nothing for being received, acknowledged, or receiving one.

- *Why:* "rewards showing up and trying things" fits trying letters once. A streak credit
  would make a daily letter the cheapest way to keep a streak, and the people paying for
  a letter written for a streak are its recipients. Rewarding received or acknowledged
  ties sparks to things the sender can't control and turns acknowledgement into a
  currency. Rewarding a recipient rewards being chosen, and matching favours heavier
  sessions: that's sparks for struggle.

**Alternative (not taken):** a stored letter also counts as showing up for the day (a new
`activity_log` action type), with the same single First letter achievement. The 1-a-day
cap stops volume, but not letters written for the streak.

### B. Retention and deletion

**Decided (the recommendation):**

- **Sender deletes their account:** waiting and unchecked letters are deleted. Received
  letters stay with their recipients with `senderProfileId` cut, so the account's link is
  gone and the letter is anonymous text, as pooled peer reflections are. Held text goes;
  open reviews of their letters close as dismissed. Strikes, pauses, blocks and their
  `letter_profiles` row go.
- **Recipient deletes their account:** the letters they received are deleted. The
  sender's Sent row keeps the status it had (it never learns why a letter stopped
  changing). Their reports stay for review with `reporterProfileId` cut. Their blocks go.
- **Data wipe:** the same as deletion for letters, except `letter_profiles.optIn` and the
  push switch stay (preferences and consent survive a wipe), and their pool fields reset
  to `out` until a new session.
- **The retention setting (6 months / 1 year):** applies to each person's own side: their
  Sent rows and their received letters past the cutoff are deleted by the nightly job.
  A received letter deleted on the recipient's side doesn't touch the sender's row.
- **Reviewed text:** held and reported letters' text is deleted 30 days after an admin
  decides, and at most 180 days after it entered the queue undecided. Strikes keep no
  text and are deleted once older than `STRIKE_WINDOW_DAYS` + `PAUSE_DAYS` (120 days),
  when they can no longer change anything. Escalations follow their existing rule
  (anonymised, kept).

**Alternative (not taken):** a received letter is deleted when its sender deletes their
account, so nothing written by a deleted account survives anywhere. Simpler to promise;
the recipient's letter disappears from their list without explanation.

### C. Supply and demand

**Decided (the recommendation):**

- **Expiry:** a letter still waiting `LETTER_WAIT_DAYS` (30) after it passed the check is
  **returned**: `status: "returned"`, no longer matched, and it frees one of the three
  slots. The Sent row says so ("Not placed. No one it fit came along this time."), and
  the sender can dismiss it. Late re-check failures (fixable, not English) end the same
  way. A paused sender's letters expire like anyone's, so a pause stays silent.
- **More letters than recipients** (likely at launch: receiving is off by default, and a
  recipient gets one a week): `letters.status.get` gains `invite: boolean`,
  false while the waiting pool is more than `INVITE_BACKLOG_DAYS` (7) of recent
  placements, and the session-end write card (not Connect's Write) stays away while it's
  false. The hourly sweep works it out (`waiting ≤ placements in the last 7 days`) and
  keeps it on a one-row `letter_stats` table, so `status.get` reads one document; it is
  `true` until the sweep first runs. Xolace stops asking for letters nobody will
  receive, and writing stays open.
- **More recipients than letters:** recipients wait; nothing promised them a letter.
- **No seeding:** Xolace never writes letters, and never with AI (Koko, #744). Before
  launch, the team and beta users write real letters through the ordinary flow on
  staging and then production.

**Alternative (not taken):** no expiry. A letter waits until it's placed or withdrawn; the
sender's three slots can stay full, so a sender may be unable to write for weeks when
supply runs ahead.

### D. The success measure

**Decided (the recommendation):** one primary measure, read monthly, with guardrails, and
no per-person counts.

- **Primary, "reached":** acknowledged ÷ opened, over letters opened in the period.
- **Guardrails** (each should stay low): reported ÷ opened, hidden ÷ opened, receiving
  turned off within 7 days of opening a letter, held ÷ sent, at-risk ÷ sent.
- **Supply health:** median hours from pass to placement; share returned unplaced.
- **Events** (server-side, no text or ids): `letter_sent { outcome }`,
  `letter_placed { waitBucket }`, `letter_opened`, `letter_acknowledged`,
  `letter_hidden`, `letter_reported { reason }`, `letter_withdrawn`,
  `letter_returned { why }`, `letters_opt_in { choice }`.
- **Never measured:** letters per sender, streaks of writing, a recipient's sessions or
  feelings after a letter (that would use emotional data for analytics, invariant 6).

**Alternative (not taken):** primary = recipients who come back for a session within 14
days of opening a letter, against opted-in recipients who didn't get one. It measures what
we hope letters do, but it's an engagement metric, and pressure to raise it pushes towards
sending more letters to more people.

### E. The contract shape

**Decided (the recommendation):** this spec as written: own tables in `convex/letters/`,
the opt-in in `letter_profiles` plus an appended consent record, the push switch in
`preferences.notifications`, pushes through a letters push mutation on `sendPushToProfile`
(a notification, as chat's are), and the client undo kept on the client.

**Pushes (owner, 19 Nov 2026): plain push for now, free to move to outreach later.** Every
letter push goes through one function, `letters/push.ts` `send({ to, type, letterId })`,
and nothing else in `convex/letters/` knows how a push is sent. Moving letters onto
outreach's `enqueue` later means rewriting that one function's body (three push-only
intents, Telegram excluded); callers, the client's tap routes and the `data` payloads
stay.

**Why the opt-in sits on a letters row, not in `preferences`** (owner asked, then agreed):

1. **Matching needs a row of its own anyway.** It reads more than the opt-in: the pool
   state (`pool`, `poolCheckAt`), the copied session signals (`aim`, `band`,
   `metadataAt`), `lastReceivedAt`, `tiebreak`, `unopenedLetterId`, and the sender side
   (`lastSentDay`, `pausedUntil`). None of that is a preference. The opt-in is the field
   that decides whether that state may exist at all, so it belongs beside it: one indexed
   read per candidate, and opting out clears the pool fields in the same write.
2. **`preferences` is a hot row.** The app subscribes to it (`preferences.get`) and the
   settings screens write it. Pool fields change at every session and placement, so on
   `preferences` they'd re-run every subscriber and collide with settings writes for no
   reason.
3. **Privacy.** The pool fields are derived from someone's sessions. `preferences.get`
   returns the row to the client and survives a data wipe; letters' state has to reset
   on a wipe and never leave the server.
4. **One source of truth.** Opt-in in `preferences` with the pool on a letters row means
   two places to keep in step on every opt-in, opt-out, wipe and deletion.

The cost is one more table and one read where Settings shows the toggle
(`letters.status.get` already returns `optIn`). The push switch is a plain notification
preference, so it does go in `preferences.notifications.letters`.

**Alternative (not taken):** fewer new pieces: the opt-in as a top-level `preferences`
field (it could be indexed there), the pool state on a separate letters row, and the three
pushes as new push-only intents on outreach's `enqueue` (quiet window, dedupe and the
deletion gate for free). It files letter pushes under outreach, which the glossary says
they aren't, and splits the opt-in from the state it governs.

---

## Testing

`convex-test` beside the code (`t.withIdentity`), one test per rule:

- **Caps:** 1 a day on the sender's local day (a withdraw doesn't give it back); 3
  waiting (unchecked counts); a race between two devices answers `limit` once.
- **Send gates:** adult only; at least one finished session; length; rate limit.
- **Outcomes:** each of the seven, with the model calls stubbed; fixable and risk store
  nothing; risk writes one `letter` escalation without text; held words refused again
  without a second strike.
- **Never placed unchecked:** an `unchecked` letter is never matched; re-checks.
- **Withdraw:** until received only; a race with placement answers `received`.
- **Matching:** opted-in only; adult only; language; 14-day freshness; safety level,
  themes, tap-only; acute and escalation-derived follow-ups; 7-day cap and one unopened;
  quiet window skips; blocks; aim window then widening; ranking (aim, band, longest
  since, tiebreak); FIFO across senders; paused senders skipped.
- **Pushes:** the letters switch and `enabled`; quiet window holds and re-checks.
- **Recipient acts:** open, acknowledge once, hide/unhide keeps the block, report removes
  and blocks.
- **Strikes and pauses:** held = strike; confirmed report = strike; two in 90 days pause
  30; outside the window no pause.
- **Access:** unauthenticated calls refused; another user's letter reads as not found and
  every mutation on it is refused; `api.admin.letters.*` rejects non-admins.
- **Never returned:** a recipient's reads carry no sender, date, reason or aim; a
  sender's carry nothing about the recipient.
- **Deletion and wipe** per decision B.

## Out of scope

From #743: replies or threads; links to Xolacers chat; choosing a recipient; public or
browsable letters; letter UI on web, desktop and the CLI; minors; anything Plus-only;
translation. From this spec: the `apps/admin` screen; a real-time alert for letters;
languages other than English (a named list widens later).

## Filled in while writing this spec

Small gaps the tickets left. Change them in review if they're wrong.

- **Fixable lines are fixed copy**, one per category, never model-written: #750 says
  "one gentle, specific line written by the check"; a model writing the sender's copy is
  the AI help #747 rules out, and a fixed table can be reviewed.
- **A held letter's repeat** answers `held` without a model call or a second strike.
- **`at risk` is `elevated` or `crisis`**, as intake's care route is.
- **The check's rate limit** (`letterCheck`), so fixable resends can't spend without
  bound.
- **Recipient language at launch:** letters are English-only (#750), so the device locale
  sent with Yes is enough to start; the classifier's session language (#749) is slice 6,
  after launch. The match reads `language` first whenever it exists.
- **Admin acts by review id**, so an admin never handles a profile id.
- **A held letter uses the sender's day** (§3 step 6), which bounds the review queue at
  one held letter per sender a day without telling a paused sender anything.
- **The recipient's push is delayed at random** (§6) so the two placement pushes can't
  be matched up by when they arrive.
- **`letter_viewed` audit rows are kept a year** and lose the sender's Clerk id when the
  sender deletes their account (§1).
- **First letter's copy** is "You wrote something kind for a stranger." It ships once its
  badge art is approved (`scripts/badges/manifest.json` must list `first-letter`).

## Build slices

One PR each to `dev`, in order; 1 and 2 can run in parallel.

1. **The check** (no tables): `lib/contactPatterns.ts` and `streamSetup` on it; the
   letters classifier, lines table and evals; the pure decision function and its tests.
2. **Tables and client functions:** schema, `status`, `send` (wired to slice 1),
   `sent.*`, `optIn.set`, `received.list/get`, `settings.*`, the `escalation_events`,
   `age_declarations`, `consent_records` and `notifications` widenings, analytics.
3. **Matching, sweep and pushes:** the pool and its pipeline hook, `match.place`, the
   cron, re-checks, expiry (decision C), `push.send` with the quiet window.
4. **Recipient acts and moderation:** `open`, `acknowledge`, `hide`, `unhide`, `report`,
   blocks, strikes, pauses, `convex/admin/letters.ts`, the audit literal.
5. **Deletion, wipe and retention** per decision B, and the First letter achievement per
   decision A.
6. **After launch:** the session classifier's language output (#749), with evals.

S21 can start against slice 2's functions with slice 1 stubbed.
