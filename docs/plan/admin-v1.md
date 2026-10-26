# Admin v1: content management UI

Status: **draft, UI first.** The screens below are built against fixture data first.
Convex wiring (`convex/admin/*` with `adminQuery`/`adminMutation`, R2 uploads, the
ingest workflow) comes after, behind the same interfaces. Parent plan:
`workspace-migration-plan.md` §3a and Phase 4f.

## What v1 replaces

The CLI scripts in `packages/backend/scripts/`:

| Script | Writes | Prod size today |
|---|---|---|
| `kindling/ingest.ts` | `audio_tracks` (support + music families), `topics` (cover art); audio + 1080px WebP thumbs to R2 | 442 tracks (432 music, 10 support), 29 topics |
| `library/ingest.ts` | `library_sources` → `library_entries` (+ bodies, facets, source credits) → `library_hubs`; entry narration audio + 30s preview; covers + 512/1280 WebP + ThumbHash | 19 sources, 20 entries (9 advice, 7 explainer, 4 story), 3 hubs, 8 narrations |
| `library/admin.ts` (`setActive`, `markSafetyReviewed`) | publish/retire, explainer safety sign-off | run via `convex run` |
| `kindling/curate-tags.ts` | LLM tag curation on the manifest | stays a script for now |

Rules the UI must surface, because the backend already enforces them:
- A story (`reuse: original`) can't go live without `consentRecordedAt`.
- An explainer can't go live until its current body is safety-reviewed.
- Every non-decorative image in a body needs alt text.
- A verbatim entry whose source has `refreshDays` and an old `retrievedAt` gets a
  "refresh" warning (soft).
- Music tracks need a licence; support tracks need narrators.

## Screens

Shell: shadcn `Sidebar` (see "Components"), plus an environment pill (staging/prod)
so nobody edits prod by accident. The current `AdminShell` / `SideNav` on `/design`
only show the visual style; the shell itself is rebuilt on shadcn `Sidebar`.

| # | Route | Screen | Notes |
|---|---|---|---|
| 1 | `/` | **Overview** | "Needs attention" list (failed items, explainers awaiting review, stale sources, stories missing consent), counts per content type, recent imports |
| 2 | `/library` | **Library entries** | Table: title, kind, subject, status, sources, narration, updated. Filters in the URL (kind, status, subject, search) |
| 3 | `/library/[slug]`, `/library/new` | **Entry editor** | New entry opens the same editor empty, after picking the kind. Metadata, markdown body + preview, cover, source credits, facets, narration + transcript, publish checklist (the gates above), Publish/Retire, Mark safety reviewed |
| 4 | `/library/hubs`, `/library/hubs/[slug]` | **Hubs** | List + editor: intro, cover, ordered items (entries and audio), reorder by drag |
| 5 | `/library/sources`, `/library/sources/[slug]` | **Sources** | Licence, permission, attribution, `refreshDays`; which entries cite it; stale badge |
| 6 | `/audio` | **Audio tracks** | 442 rows: paginated table with family, topic, series, duration, tags, status. Inline player |
| 7 | `/audio/[slug]`, `/audio/new` | **Track editor** | New track opens the same editor empty, after picking the family. Audio + thumb upload, curated tags vs source tags, licence (music), narrators/series (support), `featured`, `newUntil` |
| 8 | `/audio/topics` | **Topics** | Grid of covers; replace a cover |
| 9 | `/imports`, `/imports/new`, `/imports/[id]` | **Bulk import** | Drop only the records a batch adds or changes, under any file names (+ media); see a diff (new / changed / unchanged / rejected with reason), apply, then watch per-item status: queued → processing → live / failed, with retry |

Not in v1: users and support, moderation and feedback queues, feature flags, job
health. Each is its own PR later.

## Item status

One vocabulary across every content screen and the import run:

| Status | Badge | Meaning |
|---|---|---|
| Draft | neutral | saved, not live |
| Needs review | ember | blocked by a gate (safety review, consent, alt text) |
| Queued / Processing | sky | upload or workflow step running |
| Live | mint | `active: true` and processed |
| Failed | coral | a processing step failed; shows the step and a Retry |
| Retired | neutral, struck | `active: false` after being live |

## Components: registry first

Rule: before writing any UI, search the shadcn registry (`bunx --bun shadcn@latest
search @shadcn -q <name>`), then community registries. Build custom only when nothing
fits or the registry piece can't bend far enough. Whatever we install is restyled to
the Xolace design system (lip/depth, display font, tokens), never used stock.

Our `packages/ui` is style `base-lyra` on **Base UI**, so a community item must ship
a Base UI build. diceui and reui do (`@base-ui/react`); kibo-ui is plain React.

Already in `packages/ui`: alert, avatar, badge, button, card, checkbox, dialog,
dropdown-menu, empty, input, input-group, label, progress, separator, skeleton,
sonner, switch, table, tabs, textarea, tooltip.

| Need | Use | Registry | Notes |
|---|---|---|---|
| App shell, nav | `sidebar` (+ `sidebar-07` block as a starting point: collapses to icons) | @shadcn | Theme already maps `--sidebar-*` to surface/lavender/line. Restyle `SidebarMenuButton` active state to the lavender outline; `SidebarMenuBadge` for counts; cookie-persisted collapse, ⌘B, mobile sheet included |
| Breadcrumbs in editors | `breadcrumb` | @shadcn | |
| Page header | custom `PageHeader` compound | none | Layout only, composes our type scale + `Button` |
| Content tables | `table` + TanStack Table (shadcn data-table guide) | @shadcn | Library lists are ≤ 20 rows |
| Audio tracks (442 rows) | `data-grid` (TanStack + virtual + column controls) | @reui (Base UI) | Alternative: `@tablecn/data-table` (URL-synced sort/pages) — decide in the tracks PR |
| Filters | `toggle-group`, `select`, `combobox`, `input-group` | @shadcn | `@reui/filters` only if we need a filter builder; it's heavy |
| Pagination | `pagination` | @shadcn | |
| Forms | `field`, `select`, `combobox`, `radio-group`, `native-select` | @shadcn | `field` for layout, react-hook-form + zod |
| Tags (curated tags, facets) | `tags-input` | @diceui | |
| File upload (cover, audio, manifest) | `file-upload` | @diceui (Base UI) | Over kibo `dropzone` (react-dropzone, not Base UI) |
| Hub item reorder | `sortable` | @diceui (Base UI, dnd-kit) | |
| Narration / track preview | `media-player` | @diceui (Base UI, media-chrome) | Or a plain `<audio>` if it's too heavy |
| Markdown body | `textarea` + rendered preview first | none | Rich editors (`@kibo-ui/editor`, `@shadcn-editor/editor-x`) are WYSIWYG, and our bodies are GFM files; revisit later |
| Import steps (upload → review → apply) | `stepper` | @diceui or @reui | |
| Per-item status | `badge` (+ `spinner`) | @shadcn | One `StatusBadge` mapping our status vocabulary to badge variants |
| Run log / processing steps | `item`, `collapsible`, `progress` | @shadcn | `@shadcn/trace` is AI-tool oriented; skip |
| Confirm publish/retire | `alert-dialog` | @shadcn | |
| Side detail panel | `sheet` | @shadcn | |
| Overview tiles | `card` (existing `StatCard` style) | @shadcn | |
| Empty / loading | `empty`, `skeleton`, `spinner` | @shadcn | Flux mascot inside `Empty` |
| Command palette (later) | `command` | @shadcn | |

Before installing each, run `add --dry-run` and read what it pulls in.

## How the UI is built

- **Feature folders** in `apps/admin/src/features/<domain>/` (`library`, `audio`,
  `imports`, `overview`), no horizontal `components/` dumping ground.
- **Data behind an interface.** Each feature exposes a provider with
  `{ state, actions, meta }` (composition rule `state-context-interface`). v1 ships a
  fixture provider; the Convex provider replaces it without touching the screens.
- **Compound components, not boolean props**, built on top of the registry pieces
  above: `PageHeader` (`.Title`, `.Actions`, `.Meta`), `ContentTable` (`.Toolbar`,
  `.Filters`, `.Body`, `.Pagination`), `Editor` (`.Main`, `.Aside`, `.Section`),
  `PublishChecklist`, `StatusBadge`. Explicit variants (`EntryEditor` per kind where
  they differ) over `isStory`-style flags.
- **Server pages stay thin:** `page.tsx` reads params and renders the feature
  component inside `<Suspense>` with a skeleton.
- **URL state** for filters, tabs and pagination (nuqs), so a filtered view is a link.
- **Tables:** TanStack Table for the audio list (sorting, pagination); plain `Table`
  where a list is small.
- **Forms:** react-hook-form + zod, schemas colocated with the editor.
- **Design system:** only `@xolace/ui` components and `globals.css` tokens; the
  chunky lip/depth style from `/design`. New shared pieces start in `apps/admin` and
  move to `packages/ui` when web needs them.

Borrowed from `xolace_web_app`: strict context helper (`getStrictContext`), split
form/UI contexts in big editors, nuqs filter loaders, skeleton + error-with-retry per
section. Not borrowed: its offset-shadow theme (we use the lip/depth system).

## Build order

1. ✅ Install and restyle shadcn `sidebar` (+ `breadcrumb`, `pagination`, `field`,
   `select`, `alert-dialog`, `sheet`, `spinner`) in `packages/ui`; rebuild the shell
   on it with the env pill; `StatusBadge`, `PageHeader`, fixtures.
2. ✅ Library entries list + entry editor (fixtures; facets read-only, uploads stubbed).
3. ✅ Bulk import (diff + run status; JSON files recognised by their records).
4. Audio tracks list + track editor, topics; **New entry** and **New track** on the
   editors.
5. Hubs, sources, overview.
6. Then backend: `adminQuery`/`adminMutation`, `content.ingest`, swap providers.
   Compare warns when a Changed item was last edited in the admin, so an old file
   can't quietly overwrite it.

Prototype before building (2–3 variants each): **entry editor layout** and **import
diff review**. The tables, shell and overview follow existing patterns.

### Decided

- **Entry editor layout: "Document + rail"** (prototype A, picked over B "Tabs" and
  C "Live preview"). Copy, body and details run down one column; a sticky right rail
  holds the publish checklist and Publish, then narration, cover, facets and sources.
  Save sits in the page header. All three variants are kept on the local branch
  `prototype/admin-entry-editor-layouts` (commit `c6fe9a9b`), not in the main line.
- **Import diff review: "Grouped list"** (prototype A, picked over B "Split" and
  C "Table + sheet"). Rejected, Changed and New are cards of rows; each row expands
  in place to its field diffs (long text as a folded line diff) and has an include
  checkbox; Unchanged folds away at the end. All three variants are on the local
  branch `prototype/admin-import-review-layouts` (commit `f1c4f516`).
- **Convex is the master copy of content, not the repo files.** Once entries and
  tracks are created and edited in the admin, the JSON trees in
  `packages/backend/scripts/{library,kindling}/` are history, not something to
  re-import. So:
  - One-off items are made in the admin (New entry, New track), not as one-record
    JSON files.
  - Imports are for batches. A drop holds only the records it adds or changes, in
    files with any names (recognised by their records, not `manifest.json`).
    References must resolve against what's stored or the same drop (an entry's
    sources, a hub's items), or the record is rejected.
  - An import never deletes or retires anything missing from its files; retiring
    stays a deliberate action in the editor.
  - Later, if files are wanted back: an Export that writes the current catalogue out
    in the manifest format. Not in v1.
