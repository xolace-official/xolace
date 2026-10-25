# Expo in this monorepo

`apps/mobile` is an Expo SDK 58 app inside bun workspaces with the **isolated linker**
(`bunfig.toml`: `linker = "isolated"`). Expo supports this from SDK 54.

## Rules

- **One copy** of `react`, `react-native` and every Expo native module per app. Expo
  breaks at runtime with two. We prevent duplicates with:
  - one React version in the root `catalog` (`react: catalog:` everywhere);
  - shared packages declaring React-coupled libs as `peerDependencies` (plus dev deps
    for typecheck), never as `dependencies`;
  - `bunx expo install <pkg>` for anything Expo/RN, so the version matches the SDK.
- **No Metro monorepo workarounds.** Don't add `watchFolders`, `nodeModulesPaths`,
  `extraNodeModules` or `disableHierarchicalLookup` by hand; Expo's
  `getDefaultConfig` already handles workspaces. Metro config only composes plugins
  (Sentry → purchases stub resolver → Uniwind themes, after Phase 2).
- Native deps belong in `apps/mobile/package.json`, not the root.
- Patches (`patchedDependencies`) and `trustedDependencies` live in the root
  `package.json` and apply from the root.

## Verifying a dependency change

```sh
cd apps/mobile
bunx expo install --check      # versions match SDK 58
bunx expo-doctor               # config, duplicates, peer deps
bun why react-native           # one version only (repeat for react, expo-modules-core)
```

Then build a dev client (`bun run ios` / `bun run android`) and boot it. A JS-only
check doesn't prove native linking; say so in the PR if you couldn't build.

## EAS

- EAS uploads the repo: `.easignore` sits at the root; paths in `eas.json` are relative
  to `apps/mobile`.
- The root `postinstall` must succeed without secrets (EAS installs before env files
  exist).
- Native changes are detected by fingerprint; JS-only changes can ship as OTA updates
  only to builds with a matching runtime version (Phase 3).

## If the isolated linker breaks a library

Fall back to the hoisted linker only after the failing library is identified and
recorded (D2). Don't paper over it with Metro resolver hacks.
