---
status: accepted
---

# Mobile's design system comes from one registry, and Ease runs only loops

The redesign ported into `apps/mobile` brought one design system: themes, type, motion and a shared kit, in `src/design/`, `src/components/shared/` and `src/components/settings-kit/`. Each part has one source and one entry point, and a test fails when code goes around it. The foundation PRs landed it: F2 themes (#793), F3 fonts (#796), F4 motion (#795), F5 shared components (#799).

**Themes are generated.** `src/design/themes.ts` is the registry. Each theme has an id, a name, a tier (free or premium), a font pair, and a light and dark palette that holds only the values it sets. Production's own palettes live in `theme-values.ts`. `bun run themes` (`scripts/themes/build.ts`) builds every variant in three layers:

1. shared values common to all themes;
2. the theme's own values;
3. Xolace's extras, derived from its colours (`*-ink`, `*-wash`, `subtle`, `glass`, `tab-on` …).

The generator throws if a variant is missing a variable in `REQUIRED` (HeroUI's, production's and Xolace's) or sets one that isn't declared. It writes the committed CSS: one `@variant` per theme and mode, carrying its colours and its font roles. It also writes the names Metro registers (`extraThemes`). There are 11 themes and 22 variants. Variant names are computed (`light`/`dark` for Default, `<id>-<mode>` for the rest). `nightly` is hidden from the picker; night mode uses `nightly-dark`. Shape and spacing (`rounded-row`/`tile`/`card`/`hero`, `gutter`, `module`, `section`, `shadow-card`) are static tokens in `global.css`, the same in every theme. Fixed "printed object" palettes are tokens there too.

**Type follows the theme.** There are three font pairs in `font-pairs.ts`: warm (Bricolage Grotesque with Figtree), clear (Space Grotesk with DM Sans) and playful (Nunito). Each maps nine roles to a loaded face, since each weight is its own family. Fixed faces (Newsreader, Literata, the poster's Space Grotesk, Atkinson) ignore the theme. `TYPE` in `type.ts` names every text style, and the generator turns each into a `type-<variant>` utility. `AppText` takes `variant`, `weight`, `italic` and `color`. It caps Dynamic Type at 1.25× for display styles and 1.8× for body styles. `setThemeWithFonts` loads a theme's pair before applying the theme, so text never flashes in the wrong face.

**Motion is split by kind.**

- **Reanimated for anything driven by state:** enters, fades, presses, colour toggles, chips and swaps, plus gestures, scroll, Skia and shared clocks (`springs.ts`, `entering.ts`).
- **react-native-ease for infinite loops only** (`ease-loops.ts`, `ease-breath.ts`). An Ease loop runs as a native platform animation and costs nothing at rest. A Reanimated loop writes props every frame. In the prototype, removing a screen's last per-frame Reanimated loop took idle main-thread CPU from 21.4% to 0.2% on Explore and from 50.3% to 13.0% on Today. Those numbers also include Reanimated's synchronous UI props flags, which are on here too.
- **One entry point.** `src/design/ease.ts` is the only import of `react-native-ease`. It holds the Ease twins of the Reanimated springs.
- **Reduce motion.** `useEffectiveReducedMotion()` puts the in-app preference first and follows the OS when that is "system". It is passed to every helper as `reduced`. Ease ignores Reduce Motion, so its helpers swap enters for a 200 ms fade and rest loops at their start. Reanimated would decide again for itself, so its helpers carry `PLAY_AS_CHOSEN`.

**One of each shared piece.** Production had its own press, toast, segmented control and header options. New code uses the kit's instead:

- **press:** `PressScale`;
- **toast:** `toast()`, a plain function the data hook calls (it is a side effect, like a Convex call);
- **segmented control:** `Segmented`, the native control (SwiftUI on iOS, Material 3 on Android);
- **header options:** `useHeaderOptions`.

Two pieces for one need drift apart in scale, timing and haptic. Agents working in parallel would each pick whichever they found first. Settings-like pages share the settings kit rather than each feature keeping its own rows.

## Considered options

- **Keep hand-kept theme lists.** This is how production worked before: 22 variants listed in three places (Metro's `extraThemes`, a `ThemeName` union and the `global.css` imports). Nothing caught a variant that was missing a variable, and the redesign's derived extras would have had to be written out by hand for every variant.
- **All motion on Reanimated.** There is one library, but every loop costs a frame's work forever, and loops were most of the idle CPU.
- **All simple motion on Ease.** The migration analysis counted 165 animations Ease could take, loops and state-driven ones alike. The state-driven ones cost nothing at rest on either library, so moving them buys no CPU. Moving them would still bring Ease 0.9's limits: a loop restarts only on remount, there is no `borderColor` and no `skewX`. The owner chose loops only.
- **Keep both kits indefinitely.** Old screens keep the old pieces only until they are redone. Keeping both for new code too would leave two feels for one gesture.

## Consequences

- **Tests enforce the rules.** `import-cycles.test.ts` runs `motion-imports.ts` (Ease outside `ease.ts`, Reanimated's `useReducedMotion` in new code) and `kit-imports.ts` (a replaced piece in new code). Each test's allowlist of old files only shrinks.
- **A new theme or variable goes through the generator.** Its test fails if the committed files drift. A theme id or variant is never renamed or dropped, because users have it saved.
- **Someone has to choose a library for each animation.** A loop that reads a shared clock, or that a gesture drives, stays on Reanimated even though it loops. Splitting those clocks per consumer is open follow-up work in the prototype's Ease notes.
- **Ease 0.9's quirks are now the app's.** `useLoopRun` keys loops to restart them, and a loop stops by settling, not by `paused`. argent's recorder can't see Ease-only motion.
- **Old screens still use the old pieces** (`PressableFeedback`, `useToast`, `SegmentedControl`) and the legacy Ease imports, until the cleanup moves them over.
- **Web can't reuse the components.** When web is built, it can reuse the token values but not these React Native components (`packages/ui` is web-only).
