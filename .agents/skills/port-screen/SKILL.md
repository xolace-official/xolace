---
name: port-screen
description: Port one redesign screen PR (S1–S22) from the prototype into apps/mobile in the feature shape. Use when asked to port a screen, start an S-PR, or move a prototype feature into production.
---

# Port a screen

One S-PR from the phasing: a prototype feature becomes one v2 feature folder in
`apps/mobile`, switched on by `redesign-v2`, proven state by state. Every S-PR comes out
in the same **shape** (`apps/mobile/AGENTS.md`, "Feature shape"), so 22 of them review alike.

Paths, as the porting docs use them:

- `P/` = the prototype, branch `prototype/v3`, read only. On the owner's machine:
  `~/Developer/XolaceInc/repos/Other-projects/xolace-redesign-1`. Not there? Ask.
- `M/` = `apps/mobile`. The porting plan is `P/design/handoff/porting-guide.md` and its
  parts in `P/design/handoff/porting/`; this skill points into them rather than repeating them.

## 1. Read

1. Your row in `porting/phasing.md` §4.2 "Screens": what it **needs**. Check each
   dependency is on `dev` (`git log origin/dev`, `gh pr list`). F6 (the flag and v2 tab
   shell) is required for all of them; if it isn't merged, stop and say so.
2. Your rows in `porting/screen-map.md` §1.1: prototype screen, production route and
   screen, mark (a/b/c), notes.
3. The handoff: `P/design/handoff/<feature>.md`, plus its folder if one exists.
4. The review proof: `P/design/review/<feature>-v2/NOTES.md` and any review folder the
   handoff cites. NOTES records what the owner approved and what wasn't proven.
5. The feature's section in `porting/backend.md` (Convex functions it reads and writes,
   and the gap) and its rows in `porting/carry-overs.md` §5.1.
6. `porting/architecture.md` §7.2–7.4.

Done when you can list every route, every state the handoff shows, every Convex function
the screen calls, and every gap with the B-PR that fills it.

## 2. Build the folder

Work in this order; each step leaves something you can test.

- **Folder.** Final name if free, `<name>-v2` if an old folder holds it. A new folder is
  checked from its first commit; never add it to `LEGACY_FEATURES`.
- **Copy.** Strings from `P/src/fixtures/<feature>.ts` into `copy.ts`. Fake data from the
  same file becomes fixtures in `dev/`.
- **Model.** Every function that turns data into what to show (in the prototype's
  screens, stores and helpers) moves into `<feature>-model.ts`, with a vitest test per
  branch the handoff names. Port a prototype test if one exists.
- **Data hook.** The prototype's store (`P/src/features/<feature>/*-store.ts`) becomes
  `use-<feature>.ts` with the **same** `{ state, actions }` type; only the bodies change,
  to Convex calls (`useStableQuery` for user-driven args), PostHog events and toasts. The
  screens keep reading the same interface. No store wraps Convex. A field the backend
  doesn't serve yet comes from a fixture in `dev/` behind the hook, named in the PR.
- **Screen and parts.** Components into area folders, each under ~200 lines. Meet
  `M/AGENTS.md` conventions and §7.4's composition rules as you port: they're why the
  code is moving, not a later pass.
- **Motion and haptics** (`M/AGENTS.md`, "Motion and haptics"). `@/design/ease`,
  `springs` and `entering` keep the prototype's names; loops (`loopProps`, `useLoopRun`,
  `loopOrSettle`) come from `@/design/ease-loops` and the breath (`breath*`,
  `usePhasedBreath`) from `@/design/ease-breath`. The prototype's `useReducedMotion()`
  becomes `useEffectiveReducedMotion()`, and `useOSReducedMotion()` (the OS setting alone)
  comes from `@/lib/motion/os-reduced-motion`. `press(to)` takes `reduced` as its second
  argument. `useLoopScale`/`useBreathPeriod` are in `@/design/motion`. Haptic calls carry
  over as they are. Keep each animation on the library the prototype used (its profiles
  were measured that way); anything you add that's new goes on Ease only if it loops.
- **Shared kit** (`M/AGENTS.md`, "Shared kit"). The prototype's imports map to production:
  - `@/components/<piece>` → `@/components/shared/<piece>`.
  - `@/features/settings-v2/{parts,open-row,tile-row,settings-dialog,name-dialog}` →
    `@/components/settings-kit/…`, with these moves:
    - `TintPress` → `tint-press.tsx`; `SwitchRow` → `switch-row.tsx`.
    - `S`, `ROW`, `ROW_TALL`, `LABEL`, `accentTile`, `tileBg` and open-row's `CHEVRON` (now
      `CHEVRON_GLYPH`) → `settings-layout.ts`.
    - The kit's `Card` is `SettingsCard`.
    - `NameDialog` takes `copy`, `max` and `error` from the screen.
    - Review-only `held` is gone, from `TintPress`, `OpenRow` and `TileRow`.
    - `SwitchRow`'s `disabled` only dims the row; the switch stays live, so a blocked setting
      can still explain itself.
  - `@/components/confirm` (`confirm()`, `ConfirmHost`) → production's `ConfirmationDialog`
    (`@/components/shared/confirmation-dialog`), held open by the screen's state. The
    prototype's native alert on iOS 26 isn't ported.
  - `@/lib/{keyboard-spacer,use-keyboard-lift,use-keyboard-shown}` → `@/lib/keyboard/…`.
  - `useTokens().dangerInk` → `useTokenColor("danger-ink")`; `useScheme` →
    `@/design/scheme`; `useHeaderOptions` → `@/lib/header-options`.
  - Sheets in the prototype's `root-screens.ts`: `fitSheet` from `@/lib/root-screen`
    (it takes the `ScreenContext`; `t.surface` is `surface`). A detached sheet's route
    (`transparentModal`, no animation) takes `DETACHED_SHEET`.
  - `CountryMenu` and `Segmented` take `options` (`{ id, label }`), not fixtures.
  - `Icon` names need an Android twin (`{ ios, android }`).
  - Toasts: `toast()` from the data hook, never heroui's `useToast`. `kit-imports.ts` fails
    on `useToast`, `PressableFeedback`, `SegmentedControl`, `legacyFitSheet` and
    `useLargeHeaderOptions` in a v2 folder.
  - The first import of a kit file deletes its line from knip's `entry` (`knip.jsonc`).
- **Pieces from another feature** (the Telegram offer from `reach-me-on`, a streak ring):
  move the piece down a layer in this PR, to `src/lib`, `src/components/shared` or a kit
  in `src/components/<kit>` (architecture §7.4), and point the old feature at it too. Or
  compose the two features in the route shim. `SHARED_FEATURES` grows only with the
  owner's yes, named in the PR.
- **Leave out** review-only code: `*-jumps.ts`, stubs, `__xolace*` globals,
  `useReviewParams`, `?at=` params. The states they opened become dev states.

## 3. Wire it

- **Route shim.** The production route under `M/src/app/(protected)/` renders the v2
  screen or the old one: `currentShell() === "v2" ? <V2 /> : <Old />`
  (`M/src/lib/redesign/shell.ts`). Only routes read the shell; a v2 folder never does.
  Old routes stay. A stack route that only exists in one shell sends the other shell on
  with `<ReturnTo href />` (`M/src/lib/return-to.tsx`), never `<Redirect>`, which
  stacks a second copy of the tabs (see `profile/index.tsx`).
- **A tab.** The tab routes `(tabs)/today`, `explore`, `you` already render placeholder
  screens from `M/src/features/{today,explore,you}/`: replace the screen, keep the shim.
  The tab's label, icon and options are its entry in `V2_TABS`
  (`M/src/features/navigation/tabs.ts`); a tab route one shell doesn't show is sent on
  by `ELSEWHERE` there (`tabs.test.ts` checks every tab folder is in one or the other).
- **Stack entry.** New routes go in the feature's `screens.ts`. A new feature adds one
  import and one spread to `M/src/features/navigation/root-screens.ts`. A v2 screen
  that takes over an old route with a different presentation lists its own entry with
  `shell: "v2"`; the old feature's entry stays as it is.
- **A host** (an overlay or listener above the stack, like the arrivals host) mounts in
  the `(protected)` layout as `{shell === "v2" && <Host />}`.
- **On the simulator**, start Metro with `EXPO_PUBLIC_REDESIGN_V2=on` (and `--clear`), or
  pick the shell in Account › Dev tools › Shell. PostHog's flag is off in dev builds.
- **Dev states.** One per state the handoff shows, in `dev/`, feeding the screen
  fixtures through the same `{ state, actions }` type. Register them with `src/dev/`
  (A2). Before A2 lands, the states are fixtures plus tests only; say so in the PR.

## 4. Prove it

- `bun run check:changed` green, including `src/features/import-cycles.test.ts`. A
  feature-shape failure names the import and the fix; move the code, never the rule.
  Address any file-length warning on a file you wrote.
- Before the PR: the "Before a PR" row of the root `AGENTS.md` "Verifying".
- Screenshots of every state the PR changes, light and dark, on a simulator through
  argent (`describe` before every tap; use a simulator no other session holds; stop your
  sessions when done). Put the matching prototype render beside each one.

Done when every state from step 1 has a light and a dark screenshot, or a line in
"Could not verify" saying why not.

## 5. Open the PR

Title `feat(mobile): <screen> v2` (Conventional Commit). Body per
`.agents/rules/pull-requests.md`. In it:

- **Problem**: the S-number and the handoff.
- **Change**: the feature's file tree as a `diff`.
- **Surfaces**: mobile; docs if user-visible behaviour changed.
- **Merge danger**: two-way, behind `redesign-v2`.
- **Could not verify**: never blank. Always: microphone and voice, purchases, push,
  native auth sheets, haptics, 120 Hz motion. Plus: the carry-overs §5.1 rows still
  open, every field served by a fixture until its B-PR lands, and states with no
  screenshot.
