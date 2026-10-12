# Journal — local-first, optional sync

**Status: Planned.** Nothing here is built. Decisions dated 2026-10-11; the
open questions at the bottom are still open — explore before building.

Origin: `docs/research/sample-codes/` (feature-ideas, ui-ideas) and clarity's
offline-first sync (`src/components/extras/sample-codes/clarity-main/`).

## What it is

A plain journal for people who just want to write things down. No mirror, no
model call, no Understanding. Entries live on the device first and work fully
offline. Plus users can turn on sync to keep entries on our server.

It is a way in to reflections, not a second product: every entry has
**Reflect on this**, which sends it through the normal mirror pipeline.

## Decisions

| Question | Decision |
|---|---|
| Safety for entries that stay on the device | Can't run the safeguard on-device (it needs classifier + moderation signals, `convex/ai/safeguard.ts:169`). Crisis resources stay one tap away inside the journal at all times. |
| Relation to the mirror | Journal is a way in to reflections. **Reflect on this** on every entry. |
| Can the Fire's memory read entries? | Default **no**. Two ways in, both supported: (1) a "Let the Fire remember my journal" toggle — requires sync on; (2) an entry reaches memory when the person sends it to the mirror. |
| Sync — free or Plus? | **Plus.** Local journal is free. |

Consequence of the last two rows: the memory toggle (1) needs sync, so it is
Plus-only. Path (2) is free, because the mirror is free (rule 11).

## Rules check (`docs/foundation/xolace-for-agents.md`)

- **Rule 1 — feature test.** Helps people catch what they carry earlier by
  making writing daily, and feeds the mirror. Layer: **open question** (Fire,
  as "a capable journal that remembers you", rule 10 — or Hearth, as a daily
  habit).
- **Rule 5 — safety.** Local entries never pass the safeguard; that is a known,
  accepted gap, mitigated by always-visible crisis resources. Anything sent to
  the mirror passes the full safeguard. Add it to the known-gaps list when
  shipped.
- **Rule 6 — Understanding.** A journal entry has no Understanding. No model is
  called for a journal entry; the only model work happens after
  **Reflect on this**, inside the existing pipeline.
- **Rule 7 — consent.** Memory path (1) is an explicit opt-in toggle. Journal
  entries never enter the peer pool, distillation or anything others see.
- **Rule 11 — money.** Mirror stays free; Reflect on this is free.
- **Rule 12 — copy.** The on-device copy is encrypted; the synced server copy
  is stored like reflections today. Copy must not say "encrypted" about sync.
- **Privacy standard.** "You can delete everything" must cover journal rows.
  The journal is not Vent — copy must make clear entries are kept.

## Design

### On the device

- Encrypted SQLite: `expo-sqlite` with its SQLCipher option, or
  `@op-engineering/op-sqlite` (in `package.json`, currently unused). Pick one
  and drop the other.
- Key generated on device, stored in `expo-secure-store`.
- Screens read the local DB directly, so the first frame renders offline.
- Entry shape: `id` (device-made), `body`, `createdAt`, `updatedAt`,
  `deletedAt?` (tombstone), `seq` (local change counter), `reflectedSessionId?`.
- Sign-out and account change wipe the DB and the key.

### Sync (Plus, opt-in)

Lifted from clarity, adapted for editable entries:

- **One bridge component** is the only code touching Convex for the journal
  (`clarity-main/components/convex-sync.tsx`). Screens never wait on it.
- **Pure plan module** decides what to push and apply, testable with no device
  or deployment (`clarity-main/lib/sync-plan.ts`).
- **Idempotent push** keyed on the device-made id
  (`clarity-main/convex/sessions.ts:77-113`). Unlike clarity's immutable
  sessions, a known id is an update: apply only if incoming `updatedAt` is
  newer.
- **Pull cursor on server receive time**, not `createdAt`, so a device that
  was offline for a week is never missed (clarity's `since` query).
- **Deletes are tombstones**, kept until every device has seen them.
- **Conflicts:** same entry edited on two offline devices → keep both (the
  loser becomes a conflict copy). Never silently drop journal text.
- Plus lapses → sync pauses; local entries untouched. What happens to the
  server copy is an open question.

### Backend

- New table `journal_entries` in `convex/journal/` (feature-folder rule), with
  `by_profile_and_clientId` and `by_profile_and_receivedAt` indexes. Adding a
  table is always safe.
- Push/pull mutations gated with `hasPremium` (`convex/lib/premium.ts:34`).
- Extend `convex/jobs/dataWipe.ts` and the account-deletion jobs
  (`convex/jobs/accountDeletion*.ts`) to remove journal rows and any journal
  memory entries.

### Reflect on this

Starts a normal session and submits the entry text via `sessions.submitInput`
(`convex/sessions.ts:276`). Full safeguard, classifier, mirror, Kindling — the
journal adds nothing to the pipeline. Store the resulting session id on the
entry so it can show "Reflected" and link to the timeline. Memory ingest
happens through the existing session path (`convex/episodicMemory.ts:145`),
which is memory path (2).

### Memory toggle (path 1)

When on (requires sync): ingest synced entries into the person's episodic
namespace beside sessions, tagged `source: "journal"`, keyed on entry id so
edits replace and deletes purge. Turning the toggle off purges every journal
entry from memory.

### Client

- Feature folder `src/features/journal/`; routes under `src/app/(protected)/`.
- Crisis resources reachable from the editor and list
  (`src/features/crisis-resources/`, route `/crisis-resources`).
- Settings: sync toggle (Plus), memory toggle (disabled until sync is on).

## Phasing

1. **M** — local encrypted journal, crisis resources nearby, Reflect on this.
   No server changes. Free.
2. **M** — Plus sync + deletion jobs.
3. **S–M** — memory toggle (path 1).
4. **L, only if asked** — end-to-end encrypted sync (the hard part is moving the
   key to a second device and recovering it).

## Open questions

- Layer: Fire or Hearth?
- Plus lapse: keep, freeze, or delete the server copy? For how long?
- Does a journal-sourced memory feed the Reflection Agent / `semantic_profiles`,
  or episodic memory only?
- Journal text in memory was never safeguarded. Should crisis-level content be
  kept out of memory, and how would we know without a model call?
- Does writing a journal entry count toward streaks? (North star counts only
  completed reflections — Reflect on this does count.)
- Web: is the journal native-only?
- Search inside the journal (local full-text via SQLite FTS)?
