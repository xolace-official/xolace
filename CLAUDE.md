# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Tests
- Never write unit tests after you write code.

- Highly prefer E2E tests as the sole testing mechanism. Use them to verify complex features work. At the end of E2E tests, produce a verifiable and repeatable artifact.(E2E not setup yet, we will soon)

- If you must test a system in isolation, first write down all the ways it could fail, then write the code.

## Project Overview

What Xolace is, why, and the rules every feature follows live in
`docs/foundation/` — read `docs/foundation/xolace-for-agents.md` before
product or feature work. Team doc: `xolace.md`. Numbers/models: `xolace-technical.md`.

## Commands

- **Install**: `bun install`
- **Start dev server**: `bun expo start` (opens options for iOS sim, Android emulator, web, Expo Go)
- **iOS**: `bun expo start --ios`
- **Android**: `bun expo start --android`
- **Web**: `bun expo start --web`
- **Lint**: `bun expo lint`
- **Install Expo packages**: `bunx expo install <package>` (ensures SDK-compatible versions)
- **Dev build (iOS)**: `bunx expo run:ios` (required when adding native modules)
- **Variant local builds**: `bun android:dev` / `bun android:preview` / `bun ios:dev` / `bun ios:preview` — these set `APP_VARIANT` so the right package id (`com.xolaceincorg.xolace.dev` / `.preview` / base) is baked in. Plain `bun android` / `bun ios` falls through to the production package.
- **EAS build**: `eas build --profile development|preview|production`

## Debugging

Before diagnosing a tricky bug from scratch, **check `docs/bug-log.md`**. It's a running record of non-obvious bugs we've already solved (env mismatches, signing-cert issues, build-variant gotchas, etc.) along with the diagnostic chain that found each one. If the current symptom rhymes with a past entry, follow that entry's "Prevention / future reference" steps first — it's almost always faster than rederiving.

When solving a new bug that took more than ~30 min to diagnose, or whose fix touched something outside the codebase (cloud console, certificates, build infra), add a new entry at the top of `docs/bug-log.md` following the existing six-section shape.

## Architecture

### Provider Hierarchy
The root `_layout.tsx` wraps everything in `RootProvider` > `ThemeProvider` > `Stack` (with Protected guards). The `RootProvider` (`src/providers/root-provider.tsx`) composes:
1. `ClerkProvider` + `ConvexProviderWithClerk` — auth + backend
2. `GestureHandlerRootView` — gesture support
3. `KeyboardProvider` + `KeyboardAvoidingView` — keyboard handling via `react-native-keyboard-controller`
4. `AppThemeProvider` — multi-theme context (`src/context/app-theme-context.tsx`)
5. `HeroUINativeProvider` — HeroUI Native component library with toast config

### Routing
File-based routing via **Expo Router**. Route files in `src/app/`. Three route groups with `Stack.Protected` guards: `(onboarding)`, `(auth)`, `(protected)`. Timeline and settings have nested Stack layouts with large headers.

### Styling & Theming
**Uniwind** (Tailwind CSS v4 for React Native) via `className` props. Configured in `metro.config.js` with `withUniwindConfig`. Types auto-generated to `src/uniwind-types.d.ts`. Use `cn()` from `@/src/lib/utils` to merge classes. Use `tailwind-variants` (`tv()`) for component variant patterns.

**Multi-theme system**: Base light/dark themes defined in `src/global.css`. Additional color themes (`quiet`, `reverie`, `human`, `nightly`, `alpha`) in `src/themes/*.css` with light/dark variants each (e.g., `quiet-light`, `quiet-dark`). Theme switching via `useAppTheme()` hook from `@/src/context/app-theme-context` which calls `Uniwind.setTheme()`. HeroUI Native styles imported in `global.css` via `@import 'heroui-native/styles'` with `@source` pointing to `node_modules/heroui-native/lib`.

### UI Components
**HeroUI Native** is the primary component library. Use `useThemeColor` from `heroui-native` for reading theme color values in JS. Custom SVG icons live in `src/components/icons/`. Bottom sheets use `@gorhom/bottom-sheet` with blur backdrop support (`expo-blur`).

### State Management
**Zustand** with `persist` middleware. Single store at `src/store/store.ts` with slices for auth, theme, profile drafts, and preferences. Persistence uses `src/lib/storage/unified-storage.ts` — localStorage on web, `expo-sqlite/kv-store` on native. Only `theme` and `toggles` are persisted.

### Backend
**Convex** is the backend framework. Authentication via **Clerk** (`@clerk/expo` plugin) with JWT validation in `convex/auth.config.ts`. Use `useQuery`/`useMutation` from `convex/react` in hooks and components — authentication is enforced server-side via `requireAuth()` in `convex/lib/auth.ts`. Always read AGENTS.md for up-to-date function references.

#### Convex Directory Structure
```
convex/
  schema.ts          — 9-table schema (privacy-first design)
  auth.config.ts     — Clerk JWT provider config
  lib/auth.ts        — requireAuth(), requireSessionOwnership()
  lib/validators.ts  — Shared validators
  ai/                — AI processing pipeline
    process.ts       — Main processing orchestrator
    safeguard.ts     — Content moderation & escalation detection
    context.ts       — Conversation context assembly
    clarify.ts       — Mirror refinement logic
    providers/       — Anthropic provider, moderation
    prompts/         — articulator, distiller, classifier prompts
  jobs/              — Background jobs
    reflectionAnonymizer.ts, reflectionDistiller.ts
    dataRetention.ts, dataWipe.ts, accountDeletion.ts
    profileStats.ts
  crons.ts           — Scheduled: abandoned sessions, data retention, account deletion
  sessions.ts, sessionTurns.ts, reflections.ts, users.ts, preferences.ts, etc.
```

### The Cognition Layer Constitution Rule

> **No feature may call an LLM to re-derive something the Understanding already
> knows.** Every session's Understanding (classification, safeguard verdict,
> which episodic memories informed the mirror, which semantic profile version
> was in context) lives in `emotional_metadata` and is read only via
> `internal.understanding.getUnderstanding`. All AI features take
> Understanding + Memory (episodic RAG namespaces + `semantic_profiles`) as
> input. A new model call is justified only for genuinely new signal — a new
> modality (voice/vent) or a new artifact type — and **all model calls live
> under `convex/ai/`**. See `docs/cognition-layer-architecture.md`.

Note: the quotes → cognition layer transition keeps `loadEmotionalContext` as
an active cold-start fallback — it is not a deprecation candidate.

### Deferred Deprecations (Store-Gap Rule)

Backend deploys before app store review clears, so a new backend runs against
the old shipped UI for days. Never delete a server function, field, or arg the
minimum-supported UI may still call. Instead mark, don't delete:

- Add JSDoc `@deprecated` + a marker comment:
  `// DEPRECATED(remove-after: app >= X.Y.Z): <reason + what replaces it>`
- Add a line to the Pending Deprecations ledger below.
- Delete only once the store-published minimum supported version no longer
  references it.

**Pending Deprecations** (remove each once the store-published minimum supported app version no longer sends the arg)
- `users.getOrCreate` arg `authProviderAccountId` — server now stores `identity.subject`; value ignored.
- `sessions.submitInput` args `rawText`, `rawInputLength` — derived from `rawInput` server-side; values ignored.
- `sessions.retrySession` arg `rawText` — retry reprocesses `session.rawInput`; value ignored.
- `preferences.reducedMotion` (schema field + `update` arg) — superseded by tri-state `motionPreference`. Server keeps the boolean in sync as a back-compat mirror. Remove the field and arg once no store-published client reads `reducedMotion` (old UIs read it directly for the "sit with this" breathing).
- `notifications.removeToken` absent `pushToken` arg (remove-after: app >= 1.9.0) — old clients call `removeToken({})`, which is treated as "remove every device for this profile". Require the token once no store-published client omits it.
- Profile-keyed push recipient fallback in `sendPushToProfile` (`convex/lib/pushNotifications.ts`, remove-after: app >= 1.9.0) — a user who hasn't relaunched since the multi-device deploy still has their token under the old profile-keyed recipient, and the nudge meant to bring them back has to reach them. Any registration retires that recipient; remove the fallback once the supported version floor has passed.
- The two `confirmationState === "gave_up"` conditions in `convex/lib/followUpCadence.ts` (`followUpTier`'s Elevated bump and `computeRequiresFollowUp`'s force-grant, remove-after: app >= 1.10.0) — new clients collapse the at-cap row to "That's it" and record `refined`, so only pre-#176 binaries still write `gave_up` at the cap (new ones reach it only on the `isMaxRefinementError` race path). Deprecated in place with **no** `holding`/`gapNamed` equivalent by ruling (docs/confidence-aware-mirroring.md §8): deleting them now would strip old-binary users of today's check-in. Remove both clauses once the supported version floor passes.
- `daily_quotes.reaction` member `"not_today"` (`convex/schema.ts` + `convex/dailyQuotes.ts` `react`, remove-after: app >= 1.10.0) — #303 ships no control for it, so no current client writes it. Sharper than the rest of this ledger: narrowing the union **throws rather than degrading** — a pre-#309 binary's `react({reaction:"not_today"})` fails argument validation and the button visibly breaks. The 9 existing rows stay; the toggle renders off and the first tap overwrites.
- `paths.getActive` absent `withRead` arg (remove-after: app >= 1.11.0) — pre-#412 clients omit it and have no card for a `"read"` twig (they'd crash on `TWIG_PRESENTATION[kind]`), so read twigs are filtered out for them. Make `withRead` implicit once no store-published client omits it.
- `steadiness_insights.kind` members `link` / `helped` / `then_now` / `shape` (`convex/schema.ts`) — #525's first build, superseded by #526's five kinds. Never shown; each profile's next consolidation replaces them. Gated on data, not an app version: narrow the union once no row carries them.
- Client `isMaxRefinementError` message-substring fallback (`.includes('Maximum refinement turns')` in `src/features/reflect/session-service.ts`) — the server now throws a `ConvexError` with code `max_refinement_turns`; remove the fallback once the backend deployed before that code is no longer reachable. Conversely, the server's error message must keep the "Maximum refinement turns" substring until no store-published client matches on it.

## Good to know

Schema must always match existing data — it's always safe to add new tables.

Functions must stay backwards compatible: a client can be running an old version of the app against a new backend (see [Deferred Deprecations](#deferred-deprecations-store-gap-rule) above). Safe changes:
- Add new functions.
- Add an optional named argument to an existing function, or mark an existing one optional.
- Widen an existing argument's type to a union that still accepts the old type.
- Change behavior only in ways that stay acceptable to a client calling with the old arguments.

Scheduled functions always run their currently-deployed version, not the version live when they were scheduled — a function change must stay acceptable given the arguments a past schedule call provided.

### Build Variants
`app.config.ts` reads `APP_VARIANT` (development/preview/production) to set bundle identifiers:
- `com.xolaceincorg.xolace.dev` / `com.xolaceincorg.xolace.preview` / `com.xolaceincorg.xolace`
- Each variant has different Google OAuth credentials configured in `eas.json`

### Path Aliases
`@/src/*` maps to `./src/*` and `@/src/assets/*` maps to `./assets/*` (tsconfig.json).

## Key Conventions

- **Text**: Never import `Text` from `react-native` directly. Use `AppText` from `@/src/components/shared/app-text`.
- **Images**: Use `expo-image` only, never `Image` from `react-native`.
- **Platform-specific code**: Use Expo platform extensions (`.ios.tsx`, `.android.tsx`, `.web.tsx`). For styling, use Uniwind platform selectors (`ios:`, `android:`).
- **Theme colors**: Use CSS variables (e.g., `--background`, `--foreground`, `--accent`, `--surface`, `--overlay`). Never hard-code colors. All themes must define the same set of variables. Use `useThemeColor` from `heroui-native` when you need color values in JS.
- **Fixed palettes**: A surface may hold a fixed palette when its palette *is* the content, not the container — it is a printed object and does not follow the active theme. Members: the quotes poster (**hero and deck — one printed object, two sheets**), `vent/`, `auth/`, the Lantern reader's cover photo (ink over the photo only), the Lantern reader's Paper and Night pages (a reading mode's page is the reading surface itself; Classic's page follows the theme). This is a named category, not a per-feature exemption: anything not listed here follows the Theme colors convention above. A fixed palette still lands as tokens (e.g. `--poster-*` under `@theme static` in `global.css`) so no hex enters a component; only the values a token cannot express — a gradient stop array, a Skia opacity — live in a palette module beside the feature.
- **Fonts**: Poppins loaded via `expo-font` plugin. Space Grotesk loaded dynamically via `@expo-google-fonts/space-grotesk` in root layout. Font mapping in `global.css` `@theme` block.
- **File size**: Keep files under 200 lines. Extract logic into hooks, utils, services.
- **Imports**: Always use `@/src/` path alias. Avoid barrel re-exports that pull in unused code.
- **State**: Zustand for shared/form state. `useState` only for trivial local UI.
- **Convex reactive reads whose args change from user interaction**: use `useStableQuery` / `useStablePaginatedQuery` from `@/src/lib/convex/use-stable-query`, not raw `useQuery` / `usePaginatedQuery`. When a query's args change (paging, filtering, sorting, tab switches), Convex returns `undefined` (or resets a paginated list to `LoadingFirstPage` + `[]`) until the new data loads — any `&& data` guard then unmounts the subtree mid-interaction, blanking it and replaying mount animations (the "overreacting" problem, see https://stack.convex.dev/help-my-app-is-overreacting). The stable variants hold the previously loaded result during the reload so the UI swaps in place. Keep plain `useQuery` / `usePaginatedQuery` when args are stable — there the `undefined`/first-page-loading state is a genuine cold start you want to render a skeleton for.
- **Services**: Backend logic in `src/services/`, never directly in UI components.
- **No new horizontal files**: Do not add new files to top-level horizontal directories (`hooks/`, `services/`, `interfaces/`, `types/`, `helpers/`). Instead, colocate new code with the feature it belongs to (e.g. a new hook for the reflect flow goes in `components/reflect/` or a dedicated `features/reflect/` directory, not `hooks/`). Exceptions: `shared/` design system primitives, cross-cutting infrastructure (`providers/`, `store/`, `lib/`), and `themes/`.
- **Feature folders**: New files for a feature go in a folder named for that feature, on both backend and client (e.g. Library code lives in `convex/library/` and `src/features/library/`, with its tests alongside).
- **Adding themes**: Create a new CSS file in `src/themes/`, define `@variant <name>-light` and `@variant <name>-dark` with all required CSS variables, import it in `global.css`, register both variants in `metro.config.js` `extraThemes`, add the names to the `ThemeName` union in `src/context/app-theme-context.tsx`, and add a `toggleTheme` case for the light/dark pair.

## Key Experiments Enabled

- `typedRoutes: true` — type-safe route names
- `reactCompiler: true` — React Compiler enabled

## Folder Structure (src/)

```
app/           — Expo Router pages & layouts
  (onboarding)/ — Intro flow (promise, frame)
  (auth)/       — Authentication (Google OAuth)
  (protected)/  — Core app (reflect, sit-with-this, peer-reflections, session-end, timeline/, settings/)
components/    — UI components (shared/, ui/, icons/, reflect/states/, session-end/)
config/
context/       — React contexts (AppThemeContext for multi-theme)
providers/     — Provider composition (RootProvider)
features/
helpers/       — Helper functions and hooks (utils/, hooks/)
lib/           — Library code (utils.ts, storage/)
store/         — Zustand stores
services/      — API & integrations
interfaces/    — TypeScript interfaces by domain
types/         — Type definitions
```

## Design Principles

Critique and iterate every screen against these eight. They are the qualities
people register as "that looks right" — when a layout feels off, one of them is
missing, and naming which one is faster than guessing at fixes.

- **Contrast** — makes elements distinguishable. Differences in size, color, weight, or shape create hierarchy and draw the eye to what matters most. Without contrast, everything competes equally and nothing stands out.
- **Hierarchy** — guides the viewer through content in order of importance. Headlines before body text, primary actions looking different from secondary ones. Size, position, color, and weight all signal "look here first."
- **Alignment** — creates order and connection. Elements sharing an edge or axis feel related and intentional. Strong alignment is invisible; its absence looks sloppy immediately.
- **Proximity** — groups related items and separates unrelated ones. White space between groups tells the eye what belongs together without needing borders or boxes.
- **Repetition (consistency)** — builds cohesion. Reusing colors, fonts, shapes, and spacing patterns makes a design feel unified and helps users learn the system quickly.
- **Balance** — distributes visual weight across the composition. Symmetrical feels stable and formal, asymmetrical feels dynamic but still resolved. Either works; an unbalanced layout feels off.
- **White space (negative space)** — gives content room to breathe. It is not empty, it is active, and it determines how premium, calm, or cluttered a design feels.
- **Unity** — the overall sense that every element belongs. It emerges when the other principles work together; nothing feels arbitrary or out of place.

## Performance Best Practices

### React Compiler (`reactCompiler: true` is enabled)

The React Compiler is active in this project. It automatically memoizes values, objects, arrays, and functions via `useMemoCache`. This has important consequences:

- **Never add `useMemo` or `useCallback` manually** for performance reasons. The compiler handles it.
- **Never wrap components in `memo()`** for performance reasons. The compiler handles it.
- The ESLint rules `react-perf/jsx-no-new-object-as-prop` and `react-perf/jsx-no-new-array-as-prop` are **turned off** — these rules predate the compiler and produce false positives here.

**Exceptions — keep manual memoization in these specific cases:**

| Case | Why |
|------|-----|
| `useMemo` on Context Provider `value` objects | Context subscriptions propagate to all consumers when the value reference changes; React Compiler does not stabilize across context boundaries the same way |
| `useCallback` for functions used in `useEffect` dependency arrays | Removing them causes infinite effect loops regardless of compiler output |
| `useCallback` on a `useSyncExternalStore` `subscribe` function | An unstable `subscribe` makes React unsubscribe and re-register on every render; stability is part of the store protocol, not an optimization |
| `useCallback`/`useMemo` on functions/values with `try/finally` bodies | The compiler skips optimization for `try/finally` blocks |
| `memo()` on components with `"use no memo"` directive | The directive explicitly opts the component out of compiler optimization |

### Reanimated Shared Values (`react-native-reanimated` ≥ 4.x)

Always use `.get()` / `.set()` instead of `.value` for reading and writing shared values. The `.value` property is not compliant with React Compiler standards.

```tsx
// Wrong — .value not React Compiler-compliant
sv.value = newValue;
const current = sv.value;

// Correct
sv.set(newValue);
sv.set((prev) => prev + 1);
const current = sv.get(); // only inside worklets/callbacks, never during render
```

### Styling

- Default to Tailwind `className` props via Uniwind.
- Use `StyleSheet.create()` only when absolutely necessary.
- Inline style objects (e.g. `style={{ color: accentColor }}`) are fine when values are dynamic — React Compiler stabilizes them. No need to hoist to module-level constants or wrap in `useMemo`.
- Colors still follow the Theme colors convention above — no hex, even inline.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. The
skill has multi-step workflows, checklists, and quality gates that produce better
results than an ad-hoc answer. When in doubt, invoke the skill. A false positive is
cheaper than a false negative.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke /office-hours
- Strategy, scope, "think bigger", "what should we build" → invoke /plan-ceo-review
- Architecture, "does this design make sense" → invoke /plan-eng-review
- Design system, brand, "how should this look" → invoke /design-consultation
- Design review of a plan → invoke /plan-design-review
- Developer experience of a plan → invoke /plan-devex-review
- "Review everything", full review pipeline → invoke /autoplan
- Bugs, errors, "why is this broken", "wtf", "this doesn't work" → invoke /investigate
- Test the site, find bugs, "does this work" → invoke /qa (or /qa-only for report only)
- Code review, check the diff, "look at my changes" → invoke /review
- Visual polish, design audit, "this looks off" → invoke /design-review
- Developer experience audit, try onboarding → invoke /devex-review
- Ship, deploy, create a PR, "send it" → invoke /ship
- Merge + deploy + verify → invoke /land-and-deploy
- Configure deployment → invoke /setup-deploy
- Post-deploy monitoring → invoke /canary
- Update docs after shipping → invoke /document-release
- Weekly retro, "how'd we do" → invoke /retro
- Second opinion, codex review → invoke /codex
- Safety mode, careful mode, lock it down → invoke /careful or /guard
- Restrict edits to a directory → invoke /freeze or /unfreeze
- Upgrade gstack → invoke /gstack-upgrade
- Save progress, "save my work" → invoke /context-save
- Resume, restore, "where was I" → invoke /context-restore
- Security audit, OWASP, "is this secure" → invoke /cso
- Make a PDF, document, publication → invoke /make-pdf
- Launch real browser for QA → invoke /open-gstack-browser
- Import cookies for authenticated testing → invoke /setup-browser-cookies
- Performance regression, page speed, benchmarks → invoke /benchmark
- Review what gstack has learned → invoke /learn
- Tune question sensitivity → invoke /plan-tune
- Code quality dashboard → invoke /health

## Agent skills

### Issue tracker

Issues live in GitHub Issues on `xolace-official/xolace_app`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical roles, unchanged: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

<!-- HEROUI-NATIVE-AGENTS-MD-START -->
[HeroUI Native Docs Index]|root: ./.heroui-docs/native|STOP. What you remember about HeroUI Native is WRONG for this project. Always search docs and read before any task.|If docs missing, run this command first: heroui agents-md --native --output AGENTS.md|components/(buttons):{button.mdx,close-button.mdx,link-button.mdx}|components/(collections):{menu.mdx,tag-group.mdx}|components/(controls):{slider.mdx,switch.mdx}|components/(data-display):{chip.mdx}|components/(feedback):{alert.mdx,skeleton-group.mdx,skeleton.mdx,spinner.mdx}|components/(forms):{checkbox.mdx,control-field.mdx,description.mdx,field-error.mdx,input-group.mdx,input-otp.mdx,input.mdx,label.mdx,radio-group.mdx,search-field.mdx,select.mdx,text-area.mdx,text-field.mdx}|components/(layout):{card.mdx,separator.mdx,surface.mdx}|components/(media):{avatar.mdx}|components/(navigation):{accordion.mdx,list-group.mdx,tabs.mdx}|components/(overlays):{bottom-sheet.mdx,dialog.mdx,popover.mdx,toast.mdx}|components/(typography):{text.mdx}|components/(utilities):{pressable-feedback.mdx,scroll-shadow.mdx}|getting-started/(handbook):{animation.mdx,colors.mdx,composition.mdx,portal.mdx,provider.mdx,styling.mdx,theming.mdx}|getting-started/(overview):{design-principles.mdx,quick-start.mdx}|getting-started/(ui-for-agents):{agent-skills.mdx,agents-md.mdx,llms-txt.mdx,mcp-server.mdx}|releases:{beta-10.mdx,beta-11.mdx,beta-12.mdx,beta-13.mdx,rc-1.mdx,rc-2.mdx,rc-3.mdx,rc-4.mdx,v1-0-0.mdx,v1-0-1.mdx,v1-0-2.mdx,v1-0-3.mdx}
<!-- HEROUI-NATIVE-AGENTS-MD-END -->
