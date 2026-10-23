# Desktop platform: React Native macOS + Windows vs Tauri

Researched 2026-10-23. The facts here go stale fast: re-check the version numbers before you rely on them.

## Recommendation

**Keep Tauri.** React Native desktop looks attractive because "we already have an RN app". It is not a real reuse path for Xolace today, for three reasons:

1. **Version lag breaks the shared dependency tree.** `apps/mobile` is on React Native **0.88.0**. react-native-macos is on **0.83** and react-native-windows on **0.85**. A desktop RN app must use the same RN minor as its macOS/Windows package. So it would be a second app on an older RN, with older Reanimated and its own native dependency set.
2. **The features that make Xolace Xolace don't run there.** LiveKit's WebRTC module (voice "Talk") supports neither macOS nor Windows. Expo has no macOS/Windows support: no Expo Router, no prebuild, no EAS Build, no expo-updates. Clerk has no SDK for RN desktop.
3. **The web stack already covers desktop.** LiveKit JS, Clerk's token-based Native API flow, Convex, PostHog and Sentry all run in a webview. Tauri 2 is shipping patches weekly. Its updater, deep-link and single-instance plugins match what Phase 3 and Phase 4e plan.

**Biggest risk with Tauri:** voice in the webview. Microphone permissions need entitlements on macOS and a permission handler on Linux (WebKitGTK). Before committing, run a one-day spike: a LiveKit room in a signed macOS Tauri build and in a Windows build.

## Xolace facts this depends on (from this repo)

- Mobile: Expo SDK 58, `react-native` 0.88.0, Reanimated 4.7.1, Gesture Handler 3.3, `@livekit/react-native` 3.0 + `@livekit/react-native-webrtc` 144.2, `@clerk/expo` 4.14, Uniwind 1.12, HeroUI Native 1.0, `@expo/ui`, RevenueCat `react-native-purchases` 10, Sentry RN 8, PostHog RN, expo-updates, Skia, op-sqlite, Stream Chat Expo (`apps/mobile/package.json`).
- Web: Next.js 16 with `@clerk/nextjs` 7; still a placeholder until Phase 4 (`apps/web/package.json`, root `AGENTS.md`).
- Desktop: Tauri 2.12 shell with only `tauri-plugin-log`. It loads web's static export. The plan is sign-in via OAuth + PKCE in the system browser, a deep link back, and the refresh token in the keychain (`apps/desktop/AGENTS.md`, `docs/plan/workspace-migration-plan.md` §3, Phase 3, 4e).

## Comparison

| | **RN macOS + RN Windows** | **Tauri 2 (current plan)** |
|---|---|---|
| Code reused | In theory, mobile RN screens. In practice, only libraries with macOS/Windows native code, on RN 0.83/0.85, so not mobile's dependency set | All of `apps/web` + `packages/ui` (web must be built anyway) |
| Tracks core RN? | macOS 0.83 (2026-09-30), Windows 0.85 (2026-10-20), vs core 0.88 (2026-10-15) [1][2][3] | n/a |
| Expo (Router, prebuild, EAS, Updates) | Not supported officially [4][5]; community `expo-desktop` is "best-effort" [6] | n/a (Next static export) |
| Voice (LiveKit) | `@livekit/react-native-webrtc`: no macOS, no Windows [7] | `livekit-client` in WKWebView / WebView2; needs mic entitlements and a Linux handler [12][13] |
| Clerk | No RN desktop SDK. Clerk's official desktop SDK is Electron (beta) [8] | Community `tauri-plugin-clerk` [9], or our planned PKCE flow (same pattern as Clerk's Electron SDK [8]) |
| Animation / UI kit | Reanimated 4.7 needs RN 0.86-0.88 [10]; Uniwind, HeroUI Native, `@expo/ui` target iOS/Android | shadcn / Tailwind / CSS |
| Payments | RevenueCat RN on macOS/Windows: no evidence found | RevenueCat Web Billing or Stripe (already flagged in plan §3a) |
| Linux | None | Yes (deb, rpm, AppImage, Flatpak, Snap) [11] |
| Updates | No CodePush-equivalent (expo-updates unsupported); store or custom updater | Signed updater plugin; static `latest.json` on GitHub Releases [14] |
| Stores | Mac App Store / MS Store via native toolchains | Mac App Store, Microsoft Store, DMG, Windows installers documented [11] |
| Native code language | Objective-C/Swift (macOS) **and** C++/C# with Visual Studio 2026 + .NET 10 (Windows) [2] | Rust only; one language for all desktop OSes |
| Native feel | Real native controls (best case) | Web UI in a system webview; less native, smaller than Electron |
| Momentum | Microsoft-maintained, active, but behind core [1][2] | 2.12.5 on 2026-10-21; 3.0 alpha with an optional Chromium (CEF) runtime [3][15] |

## React Native macOS + Windows

**Pros**
- Truly native widgets and text, with lower memory use than a webview when it works.
- Both repos are active and Microsoft-maintained. As of 2026-10-23, react-native-macos was last pushed 2026-10-22 (123 open issues), and react-native-windows 2026-10-23 (806 open issues). RNW 0.85 is New-Architecture-only [2].
- One React mental model across mobile and desktop.

**Cons**
- **Version lag.** RN macOS's docs say to use the same minor for `react-native` and `react-native-macos` [16]. Mobile's 0.88 can't share one version with desktop's 0.83/0.85. Reanimated 4.7 (mobile's version) supports only RN 0.86-0.88 [10]. A desktop RN app becomes a second, older app with its own lockfile constraints, not a shared target.
- **No Expo.** Expo's docs: Expo "does not yet have built-in support for the most popular out-of-tree platforms, such as Windows and macOS" [4]. An Expo maintainer said in Nov 2025 that macOS support is too costly while react-native-macos lags. He pointed to Mac Catalyst as the easier path [5]. The RNW issue tracking Expo support has been open since Aug 2024 with no maintainer timeline [17]. So no Expo Router, no config plugins/prebuild, no EAS Build, no OTA. Our routing, build and release pipeline would not carry over.
- **Key native deps missing.** LiveKit's WebRTC fork says it doesn't currently support macOS or react-native-windows [7]. Clerk Expo is iOS/Android/web; Clerk lists no RN desktop SDK [8]. Uniwind, HeroUI Native, `@expo/ui` (SwiftUI/Compose), RevenueCat RN, Skia, Stream Chat Expo: I found no macOS/Windows support statement for any of them (evidence thin; assume absent).
- Native work needs ObjC/Swift **and** C++/C#/WinAppSDK, with Visual Studio 2026 [2]. That is two extra toolchains for a small team, and agents are weaker at both than at TS.
- No Linux.

## Tauri 2

**Pros**
- Reuses the web app we have to build anyway. Desktop cost is mostly "make web work as a static export", which `apps/web/AGENTS.md` already requires.
- The web SDKs we need exist and are first-party: `livekit-client`, Convex, PostHog JS, and Clerk's token-based Native API. Clerk's Electron SDK opens OAuth in the system browser, receives it by deep link and stores the token with OS encryption [8]. That is the same design as our Phase 4e plan, which suggests the plan is sound.
- Official plugins cover the plan: `updater`, `deep-link`, `single-instance`, `http`, `store`, `stronghold`, `notification`, `global-shortcut`, `autostart`, `window-state` (tauri-apps/plugins-workspace). Keychain: the widely used `keyring` crate (4.2.0, 2026-08-29); there is no official Tauri keychain plugin. Sentry: community `tauri-plugin-sentry` (0.8.0, 2026-10-13).
- Updater updates are signed (cannot be disabled) and served from a static `latest.json` on GitHub Releases via tauri-action [14]. That matches the plan exactly.
- Very active: 2.12.x patches on 2026-10-21; a 3.0 alpha line with a `tauri-runtime-cef` runtime [3][15]. Governed by the Tauri Programme in the Commons Conservancy [18]. Linux comes for free.
- Rust-only native layer. Agents handle Rust well and the shell stays small.

**Cons**
- Three different webviews (WKWebView, WebView2/Chromium, WebKitGTK), so test on each. Safari-engine quirks on macOS.
- Microphone/WebRTC needs care. macOS needs `NSMicrophoneUsageDescription` plus the audio-input entitlement, or getUserMedia is refused [13]. On Linux, WebKitGTK denies the mic unless the app handles the permission request (reported on Tauri 2.12.1) [12]. An older macOS duplicate-prompt bug existed in wry [19].
- Clerk's prebuilt web components don't work in the webview in prod (cookies; already documented in the plan). We own the PKCE flow or depend on a 28-star community plugin [9].
- Not native UI; a web-app feel unless we invest in desktop polish.
- Billing: no store entitlements; needs RevenueCat Web Billing or Stripe (already an open decision).

## Other options (only where they change something)

- **Electron.** It is the only desktop target with an official Clerk SDK (beta, Electron ≥ 28) [8]. It ships one Chromium everywhere, which removes the webview-variance and Linux mic risks. Costs: much bigger bundles and memory, and a Node main process. It doesn't beat Tauri on reuse. **It becomes the better pick** if the LiveKit-in-webview spike fails on WKWebView or WebKitGTK. Alternatively, wait for Tauri 3's CEF runtime to stabilize, which gives the same benefit without leaving Tauri.
- **"Designed for iPad" / Mac Catalyst from the iOS build.** This is the cheapest way to be on macOS: the existing iOS binary on Apple silicon Macs, in the Mac App Store. It is Mac-only, iPad-shaped UI, and each native module must behave. An Expo maintainer named Catalyst as more realistic than react-native-macos [5]. It is worth enabling as a stopgap, but it is not a desktop strategy. I could not re-read Apple's page during this research (evidence thin).
- **Expo web (react-native-web) inside Tauri.** It would reuse more mobile UI than Next would, but the plan's web app is Next, and this changes only what goes in the shell, not the shell choice.

## Risks to watch

1. LiveKit voice in WKWebView/WebKitGTK (see the spike above). Windows WebView2 is Chromium, so it is the lowest risk there.
2. The static export of `apps/web` with Clerk: `@clerk/nextjs`'s ClerkProvider uses server actions, so desktop needs a non-Next Clerk path or our own PKCE + `ConvexProviderWithAuth`.
3. Mac code signing: unsigned or ad-hoc builds lose keychain-backed sessions. Clerk documents this for Electron [8], and the same applies to us.
4. Tauri 3 migration later. The alpha is in progress; plan for a 2 → 3 upgrade.

## What would change the recommendation

- react-native-macos and -windows catching up to core RN (within one minor of mobile), **plus** Expo officially supporting them (Router, prebuild, EAS, Updates), **plus** LiveKit RN shipping macOS/Windows. All three are needed; none is in sight as of 2026-10-23.
- Desktop becoming a native-feel product priority over speed of delivery, with budget for ObjC/C# work.
- The LiveKit webview spike failing. In that case, move to Electron or Tauri+CEF, not to RN desktop.

## Sources

1. react-native-macos releases (0.83.0 "first 0.83 release", synced with RN 0.83.10, 2026-09-30): https://github.com/microsoft/react-native-macos/releases
2. React Native Windows 0.85.0 release notes (RN 0.85.3, VS 2026, .NET 10, New Arch only, 2026-10-20): https://github.com/microsoft/react-native-windows/releases/tag/react-native-windows_v0.85.0
3. Release lists checked with `gh release list` on 2026-10-23: React Native 0.88.0 (2026-10-15) https://github.com/facebook/react-native/releases; Tauri 2.12.5 / CLI 2.12.4 (2026-10-21), 3.0.0-alpha.5 (2026-10-14) https://github.com/tauri-apps/tauri/releases
4. Expo docs, "Migrate from React Native CLI to Expo CLI" (out-of-tree platforms): https://docs.expo.dev/bare/using-expo-cli/
5. Expo discussion #22273, maintainer comment, 2025-11-22: https://github.com/expo/expo/discussions/22273
6. shirakaba/expo-desktop (community, "best-effort", 331 stars, last pushed 2026-10-19): https://github.com/shirakaba/expo-desktop
7. livekit/react-native-webrtc README, platform table and notes: https://github.com/livekit/react-native-webrtc
8. Clerk SDK reference (Electron official, Tauri community) https://clerk.com/docs/reference/overview ; Clerk Electron SDK (beta): https://clerk.com/docs/reference/electron/overview
9. Nipsuli/tauri-plugin-clerk (community, 28 stars, last pushed 2026-03-15): https://github.com/Nipsuli/tauri-plugin-clerk
10. Reanimated compatibility table: https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/
11. Tauri distribution guide: https://v2.tauri.app/distribute/
12. Linux WebKitGTK mic denial reports (third-party, Tauri 2.12.1): https://github.com/JuiceBoxxGames/utsuwa/issues/273 , https://github.com/jfolcini/agaric/issues/5717
13. macOS mic entitlement report (third-party): https://github.com/open-jarvis/OpenJarvis/issues/1156
14. Tauri updater plugin: https://v2.tauri.app/plugin/updater/
15. Tauri CEF runtime issues, e.g. "Bundle chromium renderer": https://github.com/tauri-apps/tauri/issues/14963
16. react-native-macos getting started ("same minor version"): https://microsoft.github.io/react-native-macos/docs/getting-started
17. RNW issue #13534 "Expo support" (open since 2024-08-03): https://github.com/microsoft/react-native-windows/issues/13534
18. Tauri governance: https://v2.tauri.app/about/governance/
19. wry #1195 macOS getUserMedia prompt: https://github.com/tauri-apps/wry/issues/1195

Not verified directly (thin): macOS/Windows support statements for Uniwind, HeroUI Native, `@expo/ui`, RevenueCat RN, Sentry RN and Skia. I found none, which suggests absence but doesn't prove it. Also Apple's "iOS apps on Mac" page (it did not render).
