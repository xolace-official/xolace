# Bug Log

A running record of non-obvious bugs we've hit and how we fixed them. Add a new entry at the top whenever a bug took more than ~30 min to diagnose, or whenever the fix involved touching something outside the codebase (cloud consoles, certificates, build infra).

Each entry follows the same shape:

- **Symptom** — what the user/operator saw
- **Where it appeared** — env, build variant, platform
- **Root cause** — the actual underlying issue
- **How we diagnosed it** — the chain of inspection steps that pointed at the cause
- **Fix** — what we changed, where
- **Prevention / future reference** — what to check first if this recurs

Keep entries tight. Link out to commits/PRs/dashboards rather than pasting long logs.

---

## 2026-10-17 — Browse "New" shelf froze, then vanished in prod (every `newUntil` expired + Convex query caching)

**Symptom**
After the music upload to prod, the Browse hub's **New** shelf showed the same three tracks for weeks without changing. Then the shelf disappeared, along with the Discovery "Something to listen to" strip, and the "Featured this week" hero too when no track had `featured` set.

**Where it appeared**
Production, both platforms, all app versions. `convex/browse.ts` `getNewShelf` / `getFeatured`.

**Root cause**
Two things together:
1. The shelf only showed `active` tracks with `newUntil > Date.now()` and had no fallback. The prod manifest (`scripts/kindling/prod/manifest.json`) stamps every track with a staggered, one-per-day `newUntil`, and the last one expired on 2026-10-17 at 13:39 GMT. After that the query returned `[]`, and the UI hides an empty shelf.
2. It never rotated: it always sorted by `newUntil` desc and took the top 4. Convex also caches a query result until the data it read changes, so `Date.now()` inside the query never made it run again as time passed. The result stayed frozen even past expiry, until some `audio_tracks` write invalidated it.

**How we diagnosed it**
1. Grepped `newUntil`. Only `convex/browse.ts` reads it.
2. Decoded every manifest `newUntil` with `date -r <sec>`. All of them fell on or before today, and the latest was a few minutes before the report.
3. Checked the hub and strip render: both render nothing when the shelf is empty.

**Fix**
`convex/browse.ts`:
- `newPool` puts fresh tracks first and tops them up with the most recently ingested active tracks, capped at 12.
- `getNewShelf` takes an optional `day` (UTC days since epoch) and rotates the pool one step per day. The changing argument is what makes Convex run the query again each day.
- `getFeatured` falls back to the head of the pool.
- Both queries read with `.order("desc").take(1000)`.

The client's `src/features/browse/use-utc-day.ts` re-reads the day each time the app returns to the foreground, and both shelf callers use it. Old clients send `{}` and get the non-empty pool head, so deploying the backend alone brings the shelf back.

**Prevention / future reference**
- Never use `Date.now()` in a Convex query to drive anything time-based. The result won't refresh as time passes. Pass a coarse time arg (a day, an hour) from the client, or write the state change from a cron/scheduler.
- Any UI section fed only by an expiring field needs a fallback, or it silently disappears when the data ages out.
- If the shelf looks stale again: check the `day` arg is reaching the query (Convex dashboard logs), then check how many `active` tracks exist.

---

## 2026-10-06 — Users "randomly" logged out on cold start (it was Clerk's 7-day max session lifetime)

**Symptom**
Signed-in users open the app and land on the auth screen. It never happens mid-use, only on the next cold start. Reports said it looked random: some users after 3–6 days, some the day after they'd used the app, and sometimes many users at once.

**Where it appeared**
Production, both platforms, for months. `@clerk/expo` 4.6.1 / `convex` 1.45.0.

**Root cause**
Clerk's **Maximum lifetime** was still at the default of 7 days. That lifetime counts from **sign-in**, not from the last activity, so a daily user who signed in last Tuesday is logged out this Tuesday. The session expires in the background, and the next launch finds it dead. Users count from when they *remember* signing in, so "3–6 days" was really 7 days. The "everyone at once" reports were cohort echoes: users who re-sign-in on the same day all expire together 7 days later (e.g. 6/29–30 → 7/7, 9/16–17 → 9/30–10/1). This wasn't the inactivity timeout: users who were active the day before were still cut off at exactly 168h.

**How we diagnosed it**
1. Ruled out our own sign-out paths first. `AuthSyncGuard` and `AccountBootstrapBoundary` are the only places the app signs users out by itself, and each logs a distinct Sentry message. We couldn't read Sentry: the `SENTRY_AUTH_TOKEN` in `.env.local` only has upload scope and gets 403 on the issues API.
2. Switched to PostHog. `user_signed_out` is only captured on a manual sign-out, so a `user_signed_in` whose previous auth event is another `user_signed_in` means a forced logout. There were 235 of these in 120 days.
3. Bucketed them by hours since the previous sign-in. There's a hard cliff at **168h**: 5 forced re-logins in all of 144–167h, then 22 in 168–171h, tapering off as users return on their next open. Only 27 fell between 1h and 6.5 days.
4. 58 of the 185 users forced out after 7+ days had opened the app the day before. Activity doesn't extend Clerk's maximum lifetime, so this is the lifetime limit, not the inactivity timeout.

Query (HogQL, PostHog `execute-sql`):
```sql
SELECT intDiv(gap_h, 4) * 4 AS gap_hour_bucket, count() AS relogins
FROM (
  SELECT event,
         lagInFrame(event) OVER w AS prev_event,
         dateDiff('hour', lagInFrame(timestamp) OVER w, timestamp) AS gap_h
  FROM events
  WHERE timestamp >= now() - INTERVAL 120 DAY
    AND event IN ('user_signed_in', 'user_signed_out')
  WINDOW w AS (PARTITION BY person_id ORDER BY timestamp
               ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
)
WHERE event = 'user_signed_in' AND prev_event = 'user_signed_in'
GROUP BY gap_hour_bucket ORDER BY gap_hour_bucket
```

**Fix**
Clerk Dashboard → **Sessions** → raise **Maximum lifetime**, or turn it off and use a long **Inactivity timeout** instead. Changing either in production requires a paid Clerk plan. No code change. Sessions that already exist may keep their old expiry, so expect the pattern to fade over about a week.

**Prevention / future reference**
- **Verify:** re-run the query above a week or two after the change. The fix worked if the spike at 168h is gone.
- If "random logout on cold start" comes back, run this query **before** touching auth code. A cliff at a round number of hours means a Clerk session setting. A spread with no cliff means our code (`AuthSyncGuard`, `AccountBootstrapBoundary`, the token cache), so check Sentry for their sign-out messages next.
- Before this, months of earlier fixes (online polyfill, getToken retry, `AuthSyncGuard`, token-cache instrumentation) went after client-side causes. They were real bugs, but none of them was this one. Check the server-side session config first.
- Get a Sentry token with `event:read` scope so the sign-out messages from `AuthSyncGuard` and `AccountBootstrapBoundary` can be queried next time.
- Still open, separate: 21 forced re-logins less than an hour after the previous sign-in (12 users). Probably double-taps or reinstalls, but not checked.

---

## 2026-09-13 — iOS 18: pushed Stack screens look "laggy" — the previous screen ghosts through them for the whole transition

**Symptom**
On an iPhone XR (iOS 18.6, dev build) every push inside the Browse tab — Music / Support audio / Topics / a topic — felt laggy: the incoming list sat at its final position while the hub's entry icons and "FEATURED THIS WEEK" text were visible *through* it, and the hub stayed parked at its −30 % parallax spot for a beat before vanishing. Other screens the reporter tried (quotes archive) were fine.

**Where it appeared**
iOS 18 only. Never reproduced on the iOS 26 simulator, light or dark theme, which is where all the initial profiling happened. Reproduced 1/1 on an iPhone 16 Pro / iOS 18.6 simulator running the same dev `.app`.

**Root cause**
Every Stack layout that spreads `useLargeHeaderOptions()` also set `contentStyle: { backgroundColor: 'transparent' }` (six layouts + the root protected Stack), relying on the wrapping `<View className="bg-background">` to paint. On iOS 26 react-native-screens paints a pushed screen opaque regardless; on iOS 18 it honours the transparent content style literally, so during a push the *outgoing* screen shows through the incoming one until UIKit finishes the transition (~470 ms of ghost frames at 30 fps on the sim, longer on an XR). The quotes archive was immune because it lives under the root Stack with `headerShown: false` and its own opaque surface.

**How we diagnosed it**
1. React profiler (argent) on the iOS 26 sim across three Browse → Music pushes: ~35–96 ms nav-tree commit + ~40 ms `TrackRow` mount per push, identical every time — real, but not device- or screen-specific, so not this bug.
2. 30 fps screen recording of the push on iOS 26, frames tiled with ffmpeg: clean opaque slide. No repro.
3. Reporter's answers re-ranked the list: dev build, *every* time, every Browse sub-screen, XR / iOS 18.6, archive fine → ruled out lazy bundles and the generic nav-tree cost; pointed at the iOS-18-only header path (`headerBlurEffect`, no liquid glass) or the transparent content style.
4. Booted an iOS 18.6 simulator, installed the DerivedData dev `.app`, reporter signed in, re-recorded the same push: 14 ghost frames matching the phone screenshot exactly.
5. Set `contentStyle` to the theme background on the Browse Stack only, re-recorded: clean slide, ghost gone. Then generalised to the shared hook.

**Fix**
`src/lib/navigation-options.tsx` — `useLargeHeaderOptions()` now returns `contentStyle: { backgroundColor }` (theme background) on both platforms, and the six layouts that spread it no longer override it with `transparent`. Side fix: `topic-grid-screen.tsx` was the one LegendList without `recycleItems` (the console warning).

**Prevention / future reference**
- **A pushed native-stack screen must have an opaque `contentStyle` on iOS 18.** A `bg-background` wrapper View around the Stack does not paint the screen itself. If a push "lags" or shows the previous screen through the new one, check `contentStyle` before profiling JS.
- Anything header/transition-related must be verified on an **iOS 18 simulator** as well as 26 — `isLiquidGlassAvailable()` forks the header config, and RNS paints screens differently between the two.
- Cheapest loop for transition bugs: `screen-recording-start` (trimStatic off) → push → stop → `ffmpeg -ss <tap offset> fps=30` → tile the frames. One picture beats twenty screenshots.
- Still open, separate: the list's first Convex page lands ~250 ms after mount, so on a slow link the screen slides in empty and the rows pop. Not this bug; a skeleton or warm-up subscription would hide it.

---

## 2026-09-10 — Hitting the session rate limit hard-crashes the app instead of showing the rate-limit screen

**Symptom**
Submitting a reflection while over the `sessionInitiate` rate limit killed the app outright (SIGABRT) rather than rendering the "You've been reflecting a lot / Xolace+ raises the hourly limit" error screen. The only visible artifact was the Convex `ConvexError: {"kind":"RateLimited","name":"sessionInitiate","retryAfter":…}` log, which made it look like an unhandled promise rejection.

**Where it appeared**
iOS dev client (`com.xolaceincorg.xolace.dev`), New Architecture / Fabric, `react-native-reanimated` 4.5.1. The reflect flow: `src/features/reflect/components/states/processing-state.tsx` → `src/components/shared/sparkle-stars.tsx`.

**Root cause**
Not the Convex error — that is caught correctly all the way through (`use-reflection-machine.ts` → `extractErrorMessage`). The crash is a Fabric mounting bug the *fast* error exposes.

`initiate` rejects almost instantly, so the screen goes `processing → error` within a couple of frames. `ProcessingState` renders `<SparkleStars />`, whose four stars were Reanimated-animated nodes reconciled *directly* as children of the sparkle wrapper. Unmounting that subtree while the animations were still in flight made `RCTMountingManager performTransaction:` call `-[RCTViewComponentView unmountChildComponentView:index:]` with a stale index:

```
Attempt to unmount a view which is mounted inside a different view.
(parent: … tag = 1094 …, child: … alpha = 0; tag = 1092 …, index: 3, existing parent: 1094)
```

`index: 3` is the 4th star (`star-bottom-right`). That `NSInternalInconsistencyException` is raised on the CADisplayLink, so there is no JS frame to catch it — straight to SIGABRT. Note the stars never even became visible: their delays are 500–1500 ms and the processing state lived ~200 ms. Starting the animation was enough.

**How we diagnosed it**
1. Reproduced on device with argent (submit → crash), 3/3.
2. `~/Library/Logs/DiagnosticReports/XolaceDev-*.ips` + `xcrun simctl spawn <udid> log stream` gave the exact `NSInternalInconsistencyException` text and the `lastExceptionBacktrace` through `RCTPerformMountInstructions`.
3. First hypothesis — that `Animated.Text` / `RCTParagraphComponentView` was special — was **falsified**: swapping to `Animated.View` + `AppText` kept the crash, only the child class changed. Not text-specific.
4. Second hypothesis — the Reanimated **CSS** animation API (`animationName` keyframes) — was also insufficient on its own; the surviving variable was the animated node's *position in the tree*.

**Fix**
`src/components/shared/sparkle-stars.tsx` rewritten: each star is a `Star` subcomponent using worklet animation (`useSharedValue` / `useAnimatedStyle` / `withRepeat`) instead of CSS keyframes, and — the load-bearing part — the animated node is nested one level down inside a plain `View`. The parent only ever reconciles static views, so Fabric never indexes into an animated child. Verified 4/4 clean rate-limit reproductions with no new `.ips` reports.

**Prevention / future reference**
- **A Reanimated-animated node should not be a directly-reconciled child of a list that can unmount mid-animation.** Wrap it in a plain `View`. This is the first thing to try for any "Attempt to unmount a view which is mounted inside a different view" crash.
- A native SIGABRT during a state transition is **not** the JS error printed just before it. Convex logs every server error via `DefaultLogger#error` → `console.error` regardless of whether the promise rejection is handled, so a `ConvexError` in the console is not evidence of an unhandled rejection.
- Related dev-only red herring: RN's LogBox host view (`RCTLogBoxView`) is a full-screen `userInteractionEnabled: true` overlay, so any `console.error` makes the *whole screen* untappable in dev even though only a small toast is drawn. Buttons that "do nothing" behind a LogBox toast are not broken. Not a production issue.
- Verify animation-unmount crash fixes over **at least 3 consecutive runs** — one clean pass here was a false green.

---

## 2026-08-31 — Clerk⇄Convex desync with a valid session hangs forever (the "keep the session" branch did nothing)

**Symptom**
Rare, but terminal: Clerk reports `isSignedIn: true`, Convex reports unauthenticated, and the app sits there indefinitely. No Sentry event, no sign-out, no recovery. Only killing the app clears it.

**Where it appeared**
`src/providers/auth-sync-guard.tsx`, both platforms, `@clerk/expo` 4.6.1 / `convex` 1.45.0. Only after the grace window on a session whose token still mints — i.e. the branch the guard was written to protect.

**Root cause**
`AuthSyncGuard`'s "token is mintable → keep the session and let Convex re-authenticate" branch assumed Convex would retry. It never does.

`ConvexProviderWithAuth` calls `client.setAuth` from an effect keyed on `[authProviderAuthenticated, fetchAccessToken, authProviderLoading, client, …]` (`convex/dist/cjs/react/ConvexAuthState.js:132-139`), and `ConvexProviderWithClerk` rebuilds `fetchAccessToken` only when `[orgId, orgRole, sessionId]` change (`ConvexProviderWithClerk.js:76`). Meanwhile `authentication_manager.js:213-247` has already run `refetchToken → clearAuth → setAndReportAuthFailed` and latched `noAuth` — terminal, no retry. Nothing in that dep list changes on its own, so `setAuth` is never re-run: the guard returned without acting, `recoveredRef` latched so it never looked again, and nothing was logged.

**How we diagnosed it**
1. Read the guard against the Convex client rather than in isolation — the branch has no side effect, so its correctness depends entirely on Convex retrying.
2. Traced `authentication_manager.refetchToken`: a falsy token ends in `setAndReportAuthFailed`, with no rearm path.
3. Traced back up to what *does* re-run `setAuth` — `fetchAccessToken` identity — and found its dep list is `[orgId, orgRole, sessionId]`, none of which move during a desync.

**Fix**
Gave the branch teeth. `use-resilient-clerk-auth.ts` now owns a module-level re-auth epoch (`requestConvexReauth()`, `useSyncExternalStore`) and reports `sessionId` as `` `${sessionId}#${epoch}` `` once bumped. Changing `sessionId` is the supported way to rebuild `fetchAccessToken`, which re-runs `setAuth`. `AuthSyncGuard` calls it instead of returning, re-arms its grace timer, and after `MAX_REAUTH_ATTEMPTS` (2) forced re-auths signs out rather than hanging. Policy extracted as the pure `desyncRecovery()` and covered by `src/providers/auth-sync-guard.test.ts`.

**Prevention / future reference**
- **A recovery branch that only decides not to act is not a recovery branch.** If the plan is "let library X retry", find the code in X that does the retrying before shipping it.
- The only lever on Convex's auth state from outside is `fetchAccessToken` identity, and the only lever on *that* through `ConvexProviderWithClerk` is `orgId`/`orgRole`/`sessionId`. Note it explicitly excludes `getToken` ("Clerk's Expo useAuth hook is not memoized") — stabilising `getToken` does not trigger re-auth.
- Every recovery path needs a Sentry breadcrumb, including the happy one. This bug's whole signature in prod was silence.

---

## 2026-08-17 — Chat message actions (Copy, Edit, Delete) all silently do nothing

**Symptom**
Long-pressing a message in a xolacer chat thread opens the action menu normally, but tapping Copy, Edit, or Delete does nothing at all. No error, no toast, no crash — the menu just closes.

**Where it appeared**
Xolacer chat thread (`src/features/xolacer-chat/`), `stream-chat-expo@9.7.1` with `expo-clipboard@57`. Both platforms.

**Root cause**
One broken action poisons the queue for every action after it.

`stream-chat-expo@9.7.1`'s clipboard shim (`src/optionalDependencies/setClipboardString.ts`) calls `expo-clipboard`'s `setString`, which SDK 57 removed — only `setStringAsync` remains. The shim resolves to a function regardless, so `isClipboardAvailable()` returns true, Stream offers **Copy Message**, and the handler throws the moment it runs.

That throw is why Edit and Delete died too. Menu actions do **not** run on press — `MessageActionListItem` calls `closeOverlay()` and pushes the action onto a queue, which the overlay store flushes once the close animation finishes:

```js
// stream-chat-react-native-core/src/state-store/message-overlay-store.ts
for (const action of actionQueue) { await action(); }
actionQueue = [];   // only reached if the loop completes
```

A throw aborts the loop with the dead copy action still at the head and the queue never cleared, so it re-throws ahead of everything queued after it. **One Copy tap disables the whole message menu for the rest of the session.** The rejection is swallowed by the async subscriber, so nothing surfaces.

**How we diagnosed it**
1. Confirmed the actions were wired, not missing: `minimalMessageActions` in `thread-channel-config.ts` allows `copyMessage`/`editMessage`/`deleteMessage`, filtered subtractively out of Stream's own `messageActions()`.
2. Followed `copyMessage` → `handleCopyMessage` → `NativeHandlers.setClipboardString` → the expo shim → `Clipboard.setString`, then checked `node_modules/expo-clipboard/build/Clipboard.d.ts`: `setStringAsync` only. Guaranteed TypeError.
3. That explained Copy but not the other two — until reading `MessageActionListItem.onActionPress`, which defers via `scheduleActionOnClose`, and then the flush loop that clears its queue only after completing. One failure poisons all subsequent actions.

**Fix**
Bumped `stream-chat-expo` 9.7.1 → **9.7.6** (fixed upstream in **9.7.3**: the shim now prefers `setStringAsync` and reports failure through `onSuccess`/`onFailure` callbacks instead of throwing). Also bumped `stream-chat` `^9.50.1` → `^9.51.0` to match what core 9.7.6 requires — without it bun side-installed a nested second copy of `stream-chat` under `stream-chat-react-native-core/node_modules`.

Also removed `afterPortalSettles` from `thread-channel-config.ts` — a two-frame `requestAnimationFrame` delay we had wrapped around Edit on iOS, written for the "Edit does nothing" symptom that this clipboard bug actually caused. With the real cause fixed, Edit was verified on iOS 26 without it: cold (first menu action after a fresh launch) and immediately after a Copy tap, keyboard opening and staying open both times. Stream's own `useAfterKeyboardOpenCallback` already holds `setEditingState` until the composer's keyboard event lands.

Shipped as an **OTA**. Verified OTA-safe by diffing the 9.7.1 and 9.7.6 tarballs: `stream-chat-react-native-core` has no native code at all, and across the whole range `stream-chat-expo` changes exactly one native file — `ios/shared/StreamVideoThumbnailGenerator.swift` (thumbnail `maxDimension` and delivery mode). No new native module, no podspec change, no JS↔native contract change, and the chat surface is text-only with all pickers disabled.

**Prevention / future reference**
- **An SDK menu action that silently does nothing is rarely about that action.** Stream defers menu actions into a shared queue flushed after the close animation; any throw stops the flush and strands everything behind it. Check whether a *different* action is throwing first.
- Optional-dependency shims fail open: `isClipboardAvailable()` and friends only test that the handler is non-null, never that the underlying API still exists. After an Expo SDK upgrade, spot-check the shims in `stream-chat-expo/src/optionalDependencies/` against the current module exports.
- Before assuming a dependency bump needs a new build, diff the tarballs (`npm pack <pkg>@<ver>`) for `ios/`, `android/`, and the podspec. JS-only deltas are OTA-safe.
- When bumping `stream-chat-expo`, bump `stream-chat` to whatever `stream-chat-react-native-core` declares, or bun quietly installs two copies of the client library.

---

## 2026-07-30 — Delete account and sign-in both red-screen with `Server Error` (requireAuth throws at 15 subscriptions at once)

**Symptom**
Three reports that looked like three bugs:
1. Tapping **Delete account** in the confirmation dialog → immediate full-screen `Something went wrong / Error: [CONVEX Q(premium:getEntitlement)] Server Error`.
2. After force-quitting from recents, the user was signed out.
3. Signing back in → the same red screen again. Hitting **Retry** a few times eventually worked.

**Where it appeared**
TestFlight (production Convex deployment), iOS.

**Root cause**
One cause, three faces: **`requireAuth` reads the `users` row, so every requireAuth-gated subscription re-runs the instant that row is patched — and it threw a bare `Error`, which React surfaces as a render throw and expo-router's root `ErrorBoundary` renders as the red screen.**

- *Delete.* `users:requestDeletion` patches `accountStatus: "deleted"`. 12–23 ms later all ~15 live queries re-ran and threw `Account is not active`. No client-side ordering can win that race — the invalidation is pushed before any follow-up code runs.
- *Signed out on relaunch.* `DataScreen` → `useDataSettings.performDeleteAccount` called `requestDeletion()` and stopped — **no `signOut`**. (The sibling `useSettings.performDeleteAccount` did sign out, but nothing called it; the delete UI had been moved to the other hook.) The Clerk session survived against a dead row until the app restarted.
- *Sign-in.* `setActive()` flips Convex to authenticated, so the route guard mounts `(protected)` and fires every query **in parallel with** the `getOrCreate` mutation that creates/reactivates the row. They throw `User not found. Call getOrCreate first.` (new account) or `Account is not active` (reactivation inside the deletion grace period) until `getOrCreate` lands.

The error names `premium:getEntitlement` specifically because `RevenueCatProvider` lives in `RootProvider` — **above** the route guard and the whole navigator. No boundary inside a route group could ever have caught it.

**How we diagnosed it**
1. The Convex log was already the whole story, once read in order: `users:requestDeletion` **success** at `08:34:02.196`, then a wall of `Account is not active` at `08:34:02.208–.219`. A successful mutation immediately followed by mass query failure is the signature of a reactive invalidation, not of a failed write.
2. Same shape on the login attempt — failures at `09:21:19 / :21 / :49`, then success at `09:21:55` with no intervening deploy. Something server-side settled on its own; that points at a row being written, i.e. `getOrCreate` landing late.
3. Traced the guard: `requireAuth` reads `users`, which is exactly the doc both mutations patch → every caller is a subscriber → all invalidate together.
4. Grepped callers of `requestDeletion` and found the two hooks had diverged, only one of which signs out.
5. Located the crashing query's mount point: `RevenueCatProvider` in `root-provider.tsx`, gated only on `isAuthenticated` and sitting above `<Stack>` — which is why the red screen was full-app and not scoped to a route.

**Fix**
- `convex/lib/auth.ts` — `requireAuth` throws `ConvexError` with `code: not_authenticated | user_not_found | account_inactive` instead of a bare `Error`. The original message strings are kept inside the data object, so `ConvexError.message` (the JSON) still contains them and existing substring matchers like `session-service.ts:125`'s `'Not authenticated'` check keep working against old shipped clients.
- `src/providers/bootstrap-error.ts` — `isBootstrapError()`, the classifier: `user_not_found` / `account_inactive` are transient, everything else (including `not_authenticated`) is not. It matches the typed `ConvexError` codes **only**. Bare message throws were pre-typed-`ConvexError` behavior and are not classified: production redacts an untyped `Error` to `Server Error` before it reaches the client (that redaction is the `Server Error` symptom at the top of this entry), so substring matching could only ever fire against a dev deployment. Split out of the component so it is testable without pulling in react-native — `bootstrap-error.test.ts` covers it.
- `src/providers/account-bootstrap-boundary.tsx` — `react-error-boundary` mounted inside `ConvexClientProvider`, above `RevenueCatProvider`. Renders a loader and remounts on a backoff (4 × 800 ms); the remount drops the errored subscriptions so they re-issue against current server state instead of replaying the cached failure. `resetKeys` includes `isSignedIn`, because a landed sign-out is itself a resolution. Retry budget is tagged with the session so a slow sign-in cannot leave a later error with none. Non-bootstrap errors are rethrown from the fallback and land on the root boundary, so real crashes still reach Sentry.
- `src/features/settings/hooks/use-data-settings.ts` — the missing `signOut` after `requestDeletion`.

Used `react-error-boundary@5`, **not 6**: v6 is ESM-only and does not work on Hermes.

**Prevention / future reference**
- **A successful mutation followed within ~20 ms by a wall of failing queries is a reactive-invalidation cascade, not a failed write.** Read the Convex log in timestamp order and look at what the mutation patched.
- Anything `requireAuth` reads is a subscription dependency of *every* authed query. Patching `users` re-runs all of them, so a state that guard rejects must be either unreachable or handled gracefully on the client — never both authenticated and rejected.
- Server errors that must not crash the app need a **typed `ConvexError` code**; bare `Error` messages cannot be classified safely and message matching breaks silently.
- When deciding where an error boundary goes, check whether the failing query is mounted in `RootProvider`. Anything there is above the route guard, so a boundary inside `(protected)` will never see it.
- Duplicate hooks that wrap the same mutation drift. `useSettings.performDeleteAccount` is now dead and should be deleted rather than left as a second copy.

---

## 2026-07-27 — Listener chat: thread screen hangs on a spinner forever (Stream key/secret mismatch)

**Symptom**
- Opening any listener conversation showed an infinite `Spinner` — no error, no red box, no toast. The rest of the app (roster, request, status card) worked normally, so it read as a hang rather than a failure.
- Nothing in the client's captured network traffic pointed at Stream: only Clerk token refreshes.

**Where it appeared**
- iOS dev build (`com.xolaceincorg.xolace.dev`), dev Convex deployment `groovy-mandrill-892`. `stream-chat-expo@9.7.x`.

**Root cause**
The client and the backend were pointed at **two different Stream apps**. Convex had `STREAM_API_KEY=6ymu8zaw7ud2` (with its matching `STREAM_API_SECRET`); the app's `.env` had `EXPO_PUBLIC_STREAM_API_KEY=gtvk5c23d63d`. `getStreamToken` minted a valid JWT signed with the *first* app's secret, and `useCreateChatClient` presented it to the *second* app. Stream rejected the signature at the WebSocket handshake.

The failure is silent by construction: `useCreateChatClient` swallows the connect error and simply leaves `client === null`, which renders the provider's `LoadingView` forever. The two env vars were set from different sources at different times (`getstream env --target expo` wrote the client one; the Convex pair was pasted into the dashboard separately), so nothing ever compared them.

**How we diagnosed it**
1. Component tree showed a bare `Spinner.Root` and no `Chat`/`OverlayProvider`, isolating the stall to `StreamChatProvider` rather than `ThreadScreen`.
2. Ruled out the obvious: `EXPO_PUBLIC_STREAM_API_KEY` was present (len 12); Convex `envList` confirmed all three vars set; `getStreamToken` run via the Convex MCP returned a prompt `Not authenticated` (so the action was deployed and reachable, not hanging).
3. Ruled out an effect loop — `useAction` is memoized on `[convex, fnName]` (`convex/dist/esm/react/client.js:523`), so the `useEffect` dep is stable.
4. Probed Stream reachability *from the device* with `debugger-evaluate` + `fetch`: got a 401 `stream-auth-type missing or invalid`, i.e. network fine and the key recognised as a real app.
5. **Sentry had the answer the whole time**: `WS failed with code 43 — JWTAuth error: signature is not valid. Make sure the token is created using the secret for API key "gtvk5c23d63d"`. The error names the *client's* key, which is what exposed the mismatch. It never reached the JS console because it's an unhandled rejection inside the Stream SDK's WS layer.

**Fix**
- `convex/integrations/stream.ts`: added `getStreamApiKey()`.
- `convex/listenerChat.ts`: `getStreamToken` now returns `{ apiKey, token, userId }` — restoring what the original plan specified; the implementation had dropped `apiKey`.
- `stream-chat-provider.tsx`: `useCreateChatClient({ apiKey: session.apiKey })` instead of reading `process.env.EXPO_PUBLIC_STREAM_API_KEY`. The key now ships with the token that was signed for it, so the two cannot drift. `EXPO_PUBLIC_STREAM_API_KEY` is no longer read anywhere in the app.

**Prevention / future reference**
- **A Stream client that hangs on a spinner with no error is almost always an auth mismatch, not a network problem.** `useCreateChatClient` returns `null` on failure and logs nothing to the JS console — check Sentry, not the Metro log.
- Never give the client its own copy of the Stream API key. The token is only valid against the app whose secret signed it, so the key must come from the same call that mints the token.
- Fetch-based network inspection will not show this: the handshake fails over WebSocket, so `view-network-logs` (which hooks `fetch`) stays empty and misleadingly suggests no request was made.

---

## 2026-07-12 — Android: `Observe.logEvent` is undefined, crashing the reflect screen when a mirror arrives

**Symptom**
- Red-box render error `undefined is not a function` at `use-reflection-machine.ts:109`, thrown the moment a mirror came back from the server. The mirror never rendered.
- Only reachable by completing a real reflection (idle → type → submit) in a **fresh** session. See the verification trap below — this is what makes it easy to think you've fixed it when you haven't.

**Where it appeared**
- Android dev build (emulator). `expo-observe@56.0.21`, `expo-app-metrics@56.0.19`.

**Root cause**
`logEvent` is **not implemented on the `ExpoObserve` native module** — it lives on `ExpoAppMetrics`. `expo-observe` bridges the two with a Proxy that delegates only when the property is absent from the native target:

```js
if (typeof prop === 'string' && !(prop in target)) return Reflect.get(AppMetrics, prop);
```

On Android/Hermes the `ExpoObserve` JSI host object answers **`'logEvent' in target` → `true`** while exposing no such method. The delegation condition is therefore false, the Proxy hands back `target.logEvent` (`undefined`), and calling it throws. Confirmed live on-device: `ExpoObserve` → `hasLogEvent: true, typeof: "undefined"`; `ExpoAppMetrics` → `hasLogEvent: true, typeof: "function"`.

This is a library bug, not a misuse — `Observe.logEvent` is the API the [EAS Observe docs](https://docs.expo.dev/eas/observe/events.md) prescribe.

**How we diagnosed it**
1. Red box pointed at the `Observe.logEvent('mirror.generated', …)` call. `logEvent` *is* in `expo-observe`'s TypeScript types, so tsc was happy — runtime-only failure.
2. Read `expo-observe/src/module.ts`: found the `requireNativeModule('ExpoObserve')` + Proxy-fallback-to-`AppMetrics` structure, and that `logEvent` is declared in `AppMetricsModule.kt` (`Name("ExpoAppMetrics")`), not `ObserveModule.kt` (`Name("ExpoObserve")`).
3. Settled it empirically rather than theorising: `debugger-evaluate` against the running app, dumping `getOwnPropertyNames` + `'logEvent' in m` + `typeof m.logEvent` for both `globalThis.expo.modules.ExpoObserve` and `.ExpoAppMetrics`. That exposed the `in`-says-yes / value-is-undefined contradiction that defeats the Proxy guard.

**Fix**
- `use-reflection-machine.ts`: import `AppMetrics` (re-exported by `expo-observe`) and call `AppMetrics.logEvent(...)` directly, bypassing the Proxy. Same native method and same dashboard event — `ExpoAppMetrics.logEvent` is what the Proxy was trying to reach anyway.

**Prevention / future reference**
- **Verification trap — the one that nearly let a non-fix through.** The `logEvent` call is guarded by `if (durationMs !== undefined)`, and `durationMs` is derived from `submitTimestampRef`, which is only set by a submit *in the current JS lifetime*. So after a reload the session **resumes straight to mirror with `submitTimestampRef === null`**, `logEvent` is never called, and the mirror renders fine — with or without the fix. Reloading after the crash "fixes" it, which is pure illusion. **Only a fresh idle → type → submit → mirror round-trip exercises this line.** Any change to this path must be verified that way.
- If another `Observe.<method>` throws `undefined is not a function` on Android, check whether the method belongs to `ExpoAppMetrics` rather than `ExpoObserve`: `grep 'Function("' node_modules/expo-observe/android/**/*.kt node_modules/expo-app-metrics/android/**/*.kt`. Only `configure`, `setBundleDefaults`, and `dispatchEvents` are truly on `ExpoObserve`; `logEvent`, `markFirstRender`, `markInteractive`, and `setGlobalAttributes` all live on `ExpoAppMetrics` and are reachable only through the broken Proxy. Call `AppMetrics.*` directly.
- TypeScript cannot catch this class of bug — the types describe the merged surface; the Proxy fails at runtime.
- Re-test on an `expo-observe` upgrade: if upstream fixes the `in` check, the `Observe.*` calls become safe again.

---

## 2026-07-12 — Android: mic + close buttons dead in the typing state (invisible views eat touches)

**Symptom**
- On the reflect screen's **typing** state, the mic button and the ✕ (dismiss) in the top-right header row did nothing when tapped. No error, no log, no visual press feedback.
- Everything else on the screen worked: the text field focused and accepted input, and "Let it out" submitted normally.
- Worked in a previously shipped build, so it read as a regression rather than a never-implemented feature.

**Where it appeared**
- Android only (emulator + device). iOS was completely unaffected.

**Root cause**
Two independent bugs, both invisible on iOS for the *same* underlying reason: **Android lets an invisible view keep consuming touches; UIKit does not.** `UIView.hitTest:` skips any view that is `hidden`, has `userInteractionEnabled = NO`, or `alpha < 0.01` — so an invisible layer is transparent to touch. Android's `ViewGroup.dispatchTouchEvent` never consults `getAlpha()`, so a transparent-but-laid-out view is a wall.

1. **The dead buttons.** `reflect-screen.tsx` mounted its two `Stack.Toolbar.Button`s unconditionally and merely marked them `hidden={!isIdle}`. On Android the toolbar's transparent host view stays laid out across the top ~10% of the screen (y ≈ 0.051–0.105 normalized) even while "hidden", swallowing every touch in that band — exactly where the typing row's mic and ✕ sit (y ≈ 0.064–0.092).
2. **A ghost-screen leak, found while diagnosing.** The outgoing screen was rendered as `<EaseView animate={{opacity: 0}}>` with **no `initialAnimate`**. In `react-native-ease`, `initialAnimate` defaults to `animate` (see `EaseView.tsx`: `const initial = initialAnimate ?? animate`), so the native view mounts *already at* opacity 0, `hasInitialAnimation` is false, no animation runs — and therefore **`onTransitionEnd` never fires**. That callback is what calls `onOutgoingComplete()`, so `previous` never unmounted and `isTransitioning` stayed `true` forever. Every screen the user left stayed mounted underneath, timers and Convex subscriptions included. Regressed in `94dbd11` (Reanimated → `react-native-ease` migration); the old Reanimated `FadeOut` unmounted correctly.

**How we diagnosed it**
1. `describe` (Argent) on the running emulator — the accessibility tree showed the **entire idle screen** (texture words, "Tap to begin writing", menu, streak) still mounted alongside the typing screen, permanently. That surfaced bug 2 immediately.
2. Tapped the ✕ → nothing. Tapped the ghost idle screen's own (invisible) buttons → also nothing. Tapped the text field → cursor moved. So touches *were* reaching the typing screen; only the top strip was dead. That ruled out the ghost screen as the blocker and reframed it as a **geometric** problem.
3. Proved the geometry instead of guessing: temporarily added `mt-16` to the typing header row. At y ≈ 0.137 the ✕ tapped fine and dismissed to idle; at y ≈ 0.078, identical code, dead. Same element, same handler, only the y-coordinate changed.
4. Cross-referenced the idle-state `describe`: the two `Stack.Toolbar` `ComposeView`s occupy y 0.051–0.105 — precisely the dead band.

**Fix**
- `reflect-screen.tsx`: render the `Stack.Toolbar` blocks **only when `isIdle`** (`{isIdle && <>…</>}`) instead of mounting them always with `hidden={!isIdle}`.
- `reflect-screen.tsx`: give the outgoing `EaseView` an explicit `initialAnimate={{ opacity: 1 }}` so a real 1→0 transition runs and `onTransitionEnd` fires, unmounting the outgoing screen.
- Verified on the Android emulator: ✕ dismisses to idle from its normal position; mic prompts for permission, then flips the placeholder to "I'm listening…" with the system mic indicator lit; `describe` shows only the typing elements, no ghost screen.

**Prevention / future reference**
- **"Works on iOS, dead on Android" for a tap almost always means an invisible view is on top.** Don't start from the button — dump the tree (`describe`) and look for a layer covering that region. Moving the element a few dozen px is a one-line, decisive test.
- Never hide native chrome by leaving it mounted with a `hidden` prop when the region overlaps interactive content. Unmount it.
- `react-native-ease`: **`onTransitionEnd` only fires if a transition actually runs**, and a transition only runs when `initialAnimate` differs from `animate`. Any exit animation whose completion drives an unmount *must* pass an explicit `initialAnimate`, or it will silently never unmount. If a screen seems to leak, check for a missing `initialAnimate` first.
- Screens stuck mounted are invisible on iOS but still alive — leaking timers, animations, and Convex subscriptions. A stale `describe` tree is the cheapest way to spot them.

---

## 2026-07-11 — Android Google Sign-In silently fails on a *local* build (recurrence)

**Symptom**
- Same signature as the 2026-05-24 entry: account picker opens, user picks an account, it spins, then nothing. No error, no throw. Only log line was `[GoogleAuth] no session created — createdSessionId: null`.
- Emulator had a Google account and Play Services, so the usual first suspects were already ruled out.

**Where it appeared**
- Android emulator, **local** `expo run:android` build (not EAS).

**Root cause**
Two mismatches stacked, both invisible:
1. The build ran as **production**. `bun android` / `bunx expo run:android` leaves `APP_VARIANT` unset, so `app.config.ts` falls through to the prod package `com.xolaceincorg.xolace` (app name "Xolace", not "Xolace (Dev)"). Same trap as 2026-05-24, different entry point.
2. A local build is signed with the **Expo template debug keystore** at `android/app/debug.keystore` (SHA-1 `5E:8F:16:06:…`) — *not* the EAS key and *not* `~/.android/debug.keystore`. That package + SHA-1 pair had no Android OAuth client in Google Cloud, so Credential Manager matched nothing and returned no credential and no exception.

The registered OAuth client existed for `…xolace.dev` + the debug SHA-1; the app on the device was `…xolace` + the same SHA-1. One field off, total silence.

**How we diagnosed it**
1. `adb shell pm list packages | grep xolace` → `com.xolaceincorg.xolace` installed. Wrong variant, immediately.
2. `adb shell pm path` → `adb pull` → `apksigner verify --print-certs` → the APK presents SHA-1 `5E:8F:16:06:…`.
3. `keytool -list` on `~/.android/debug.keystore` gave a *different* SHA-1 (`3B:34:9D:…`) — proving Gradle signs with the project-local `android/app/debug.keystore` (see `signingConfigs.debug` → `storeFile file('debug.keystore')`), not the user's personal one.
4. Parsed `google-services.json`: zero registered `certificate_hash` entries for all three packages.

**Fix**
- Rebuild with `bun android:dev` so the package is `com.xolaceincorg.xolace.dev`, matching the registered OAuth client.
- Register the local debug keystore's SHA-1 for the `.dev` package (Google Cloud Android OAuth client) and its SHA-256 (Clerk native Android entry).

**Prevention / future reference**
- **Check the app name first.** "Xolace" instead of "Xolace (Dev)" means you built prod. Costs one second and rules out the most common cause.
- `android/` is gitignored, so the debug keystore comes from the Expo prebuild template and is normally identical across machines — which is why one registration covers the whole team. Don't rely on it silently: verify with `keytool` (see `dev-onboarding.md` §5).
- The installed APK is the source of truth for the SHA-1, not `eas credentials` and not `~/.android/debug.keystore`.
- New collaborator onboarding, including this whole trap, is written up in `docs/dev-onboarding.md`.

---

## 2026-06-10 — `eas update` fails with "Channel has no branches associated with it"

**Symptom**
- Running `eas update --environment preview --channel preview` (or any channel) exits with:
  `Channel has no branches associated with it. Run 'eas channel:edit' to map a branch.`
- The environment variables section prints correctly — that part is fine.

**Where it appeared**
- EAS Update workflow, first time publishing to a newly-declared channel (e.g. `preview`).
- Channels declared in `eas.json` under `build.<profile>.channel` do **not** get a branch mapping automatically.

**Root cause**
EAS channels and EAS branches are separate entities. Declaring `"channel": "preview"` in `eas.json` creates the channel concept (and builds tag their artifacts with it) but does not create or link a branch. `eas update` delivers updates via branches, so the channel must be explicitly wired to one before any update can be published.

**How we diagnosed it**
Error message was self-describing. Confirmed via `eas channel:list` that the channel existed with no branch attached.

**Fix**
1. Create the branch if it doesn't exist yet:
   ```bash
   eas branch:create preview
   ```
2. Map the branch to the channel:
   ```bash
   eas channel:edit preview --branch preview
   ```
3. Re-run the update:
   ```bash
   eas update --environment preview --channel preview --message "your message"
   ```

**Prevention / future reference**
- Whenever a new build profile with a `channel` value is added to `eas.json`, immediately run `eas branch:create <name>` and `eas channel:edit <name> --branch <name>` so the plumbing is ready before the first OTA push.
- `eas channel:list` and `eas branch:list` are fast sanity checks before any `eas update` run.
- The `--environment <name>` flag is required so EAS recomputes the fingerprint using the same env vars that were baked into the build (EAS secrets). Omitting it causes a fingerprint mismatch because local `.env.local` values differ from EAS-managed secrets.

---

## 2026-05-24 — `react-native-share` `shareSingle` to WhatsApp / Telegram / Instagram broken on iOS (TestFlight)

**Symptom**
- Quote share sheet → tap **WhatsApp** on iOS: nothing happens, no error, no log.
- Quote share sheet → tap **Telegram** on iOS: Telegram opens with the raw file path (`/private/var/.../tmp/ReactNative/<uuid>.png`) and a trailing `(null)` pasted into the chat as a text message — no image attached.
- Quote share sheet → tap **Instagram** on iOS: Instagram opens its "Share to Instagram" sheet but the preview shows whatever the user's most-recent camera roll item is (in our repro, a screenshot of the Telegram chat) — not our quote image.
- Android (all three apps) worked fine. Native share sheet ("More") worked fine on both platforms.

**Where it appeared**
- iOS only. All build variants. TestFlight (v1.3.0).
- Code path: `src/features/quotes/hooks/use-quote-share-actions.ts` calling `RNShare.shareSingle({ social: Social.{Whatsapp|Telegram|Instagram}, url: <localPngPath>, type: "image/png" })`.

**Root cause**
`shareSingle` on iOS deep-links via app URL schemes; the URL schemes for these apps do not accept file/image payloads:
- **WhatsApp iOS** scheme is `whatsapp://send?text=...` — text only. Passing `url:` is silently dropped, hence the no-op.
- **Telegram iOS** scheme is `tg://msg_url?url=<value>&text=<message>` — the library URL-encodes our local file path into the `url=` query param as a string, and the missing `message` becomes the literal `(null)` Telegram renders.
- **Instagram Feed iOS** uses `instagram://library?LocalIdentifier=...` semantics — the lib doesn't pass our image to Instagram at all; per the upstream docs, "Instagram tries to select the very last file of the cameraroll", so it picks whatever the user most recently added to Photos.

Android works because it uses `Intent.ACTION_SEND` with a content URI — a totally different mechanism that actually accepts the file.

**How we diagnosed it**
- Confirmed `imageUri` was a valid file path by reading the screenshot of the Telegram message — it's our generated PNG path.
- Recognized `(null)` as a Swift `Optional<String>.description` stringification → message arg unset → the lib is building a text-only URL.
- Cross-checked against `react-native-share` docs (`research/rn-share.md` §Share Instagram, §Supported Applications) which explicitly call out the camera-roll-latest behavior for Instagram and don't list image support for WhatsApp/Telegram on iOS.

**Fix**
- `src/features/quotes/hooks/use-quote-share-actions.ts`: branch on `Platform.OS === "ios"`.
  - WhatsApp / Telegram iOS → fall back to `shareGeneric` (`expo-sharing` system share sheet) defensively.
  - Instagram iOS (Feed path, no `EXPO_PUBLIC_FB_APP_ID`) → `MediaLibrary.saveToLibraryAsync(imageUri)` first so our PNG is the newest camera-roll item, then `shareSingle(Social.Instagram)`. Toast the user ("Saved to Photos · Opening Instagram…") so the gallery growth isn't surprising. Fall back to system share sheet if photo permission is denied.
- `src/features/quotes/components/quote-share-sheet.tsx`: drop the WhatsApp and Telegram tiles on iOS via a `Platform.OS` switch on `SOCIAL_ITEMS`. iOS users reach WhatsApp/Telegram via the **More** tile (system share sheet — which actually sends the image, because the apps' Share Extensions handle files even though their URL schemes don't).

**Prevention / future reference**
- Before wiring any `shareSingle` social target, check `research/rn-share.md` for the iOS column and re-read the per-app section. iOS image deep-links are the exception, not the rule.
- If a TestFlight share button "does nothing" on iOS, first hypothesis: the target app's URL scheme is text-only. Confirm by passing a `message` and watching whether *that* is delivered (it will be).
- If you ever turn on `EXPO_PUBLIC_FB_APP_ID` to enable Instagram Stories, re-test the Stories path on iOS — `backgroundImage` accepts URL or base64 per docs; a `file://` path may need conversion.

---

## 2026-05-24 — Android Google Sign-In silently fails after account pick (dev + preview + prod)

**Symptom**
- iOS Google Sign-In worked end-to-end (`createdSessionId` set, redirect to protected stack).
- Android: tapping "Continue with Google" opened the Google account picker, user picked an account, then nothing happened. No error toast, no error log. `[GoogleAuth] no session created — createdSessionId: null` warning fired and the user stayed on the auth screen.
- Reproduced on dev, preview, and (potentially) prod builds.

**Where it appeared**
- All three Android variants (`com.xolaceincorg.xolace.dev`, `.preview`, base prod).
- `@clerk/expo` `useSignInWithGoogle()` via the native Credential Manager flow.

**Root cause**
A stack of three independent issues that all manifested with the same symptom (silent `GetCredentialCancellationException` from Android Credential Manager):

1. **Missing Android OAuth client in Google Cloud for the dev/preview/prod package + SHA-1 combos.** For Credential Manager to mint an ID token for the Web Client ID, an Android OAuth client (package + SHA-1) must exist in the **same** Google Cloud project as the Web Client ID. Each build variant has a different package name **and** is signed with a different key, so each needs its own registration.
2. **Local `expo run:android` was building as production**, not dev. `app.config.ts` reads `APP_VARIANT` to pick the package name; without `APP_VARIANT=development` set, the local build installed as `com.xolaceincorg.xolace` instead of `com.xolaceincorg.xolace.dev`. We were registering an OAuth client for `.dev` but the installed APK was prod — perfect mismatch.
3. **EAS preview keystore had been rotated at some point**, so the SHA-1 EAS *displayed* (`8E:FF…`) didn't match the SHA-1 of the actually-installed APK (`BF:90…`). Fixing the EAS default keystore back, then rebuilding, restored the match.

Underlying these: `EXPO_PUBLIC_CLERK_GOOGLE_ANDROID_CLIENT_ID` is **not** actually read by `@clerk/expo`; only the Web Client ID is. The Android Client ID values just need to *exist* in Google Cloud so the package + SHA-1 lookup succeeds — they're never passed to native code.

**How we diagnosed it**
1. JS-level log showed empty `signIn`/`signUp` objects with no thrown error → meant `signIn.create()` was never called → meant `presentExplicitSignIn` returned a non-success response, but the wrapper swallowed the response type.
2. Bypassed the wrapper by calling the native turbo module directly via `TurboModuleRegistry.get('ClerkGoogleSignIn')` to see the raw `{type, data}` payload (and any thrown `code`/`message`).
3. That surfaced `code: SIGN_IN_CANCELLED` from `androidx.credentials.exceptions.GetCredentialCancellationException` — the canonical "no matching Android OAuth client found" signature.
4. Pulled the installed APK and ran `apksigner verify --print-certs` to get the SHA-1 the device actually presents. Compared against what was registered in Google Cloud + Clerk + EAS — each variant had a different mismatch.

**Fix**
- **Google Cloud Console** (project `30023455189`): one Android OAuth 2.0 client per package, each carrying the SHA-1 of the key actually used to sign that variant's APK. For prod, **two** Android clients: one for the EAS upload key, one for the Play App Signing key (Play re-signs on upload).
- **Clerk Dashboard** → Native applications: one Android entry per package, SHA-256 of every signing key listed under it.
- **Firebase** (`xolace-app` project): added each Android package as a separate app so `google-services.json` contains a `client` block for each (otherwise the Gradle `processGoogleServices` task fails the build).
- **`google-services.json`** (root + `google-services-preview/`): now contains client entries for `.dev`, `.preview`, and base prod packages.
- **`package.json` scripts** (recommended): added `android:dev` / `android:preview` aliases that set `APP_VARIANT` so local `run:android` never silently builds the wrong variant.
- **`AuthScreen.tsx`**: removed the temporary `TurboModuleRegistry` debug shim and `Alert` calls once each variant's flow was confirmed.

**Prevention / future reference**
If a Google sign-in or any signing-cert-bound Google API silently fails on Android, in this order:

1. `adb shell pm list packages | grep <app>` — confirm the installed package matches what you *think* you built.
2. `adb shell pm path <package>` → `adb pull` → `~/Library/Android/sdk/build-tools/<latest>/apksigner verify --print-certs <apk>` — get the SHA-1 the device actually presents. Don't trust `eas credentials` blindly; the installed APK is the source of truth.
3. Cross-check that SHA-1 against:
   - The Android OAuth client(s) in Google Cloud → APIs & Services → Credentials. Must be in the **same project number** as the Web Client ID.
   - The SHA-256 list on the matching Clerk Native Android entry.
4. If installing from Play (even Internal Testing): also register the Play app-signing key SHA-1/256 from Play Console → Test and release → Setup → App integrity → App signing. Play re-signs every install, so the EAS/upload key SHA is not what users' devices present.
5. After any change to Google Cloud, flush cached "not authorized" state on the device:
   ```
   adb shell pm clear <package>
   adb shell pm clear com.google.android.gms
   ```
6. If Credential Manager is throwing `SIGN_IN_CANCELLED` despite a correct SHA-1, the bug is almost always that the Android OAuth client lives in a different Google Cloud project than the Web Client ID. Check the project number in the console URL.

Related files: `src/features/auth/components/screens/AuthScreen.tsx`, `app.config.ts`, `google-services.json`, `google-services-preview/google-services.json`, `eas.json`.
