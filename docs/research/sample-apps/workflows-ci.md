# Workflow and CI ideas from the sample apps

Source tags (**C** Companion, **P** Private Mind, **R** Rakazo) and context: [README.md](README.md).
GitHub Actions, CI checks and release guards. Agent and dev tooling is in [tooling.md](tooling.md).

## Testing in CI

**Maestro smoke tests on an Android emulator (C).** `.github/workflows/ci.yml` builds an x86_64 release APK, runs `reactivecircus/android-emulator-runner`, installs Maestro, runs flows with platform tags (`--exclude-tags=ios-only`), and uploads JUnit output. It writes a stub `google-services.ci.json` so no secret is needed, and checks flow syntax first (`apps/mobile/scripts/check-maestro-flows.sh`).
→ Xolace has no Maestro. Start with onboarding, a vent submit, and the crisis-resources screen.

**Screenshot galleries from CI (R).** Nightly web screenshots (`.github/workflows/nightly-verification.yml`) and Android screenshots via Maestro on KVM (`mobile-android-screenshots.yml`, `.github/scripts/capture-mobile-android-screenshots.sh`). UI PRs link the CI screenshot.
→ Backs our "proof in PRs" rule without anyone running a simulator by hand.

**Bundle-size diff against the base branch (C).** `.github/workflows/bundle-analysis.yml` uploads stats on `main` and compares on PRs.
→ For the web static export (desktop) and the CLI binary.

## Release guards

**Refuse store builds with dev tools on (P).** `.github/workflows/android-release.yml` fails if `EXPO_PUBLIC_DEV_TOOLS` is set.
→ Add to `release.yml` for `devTools.ts`, seed and debug flags.

**Remote content with `minAppVersion` and frozen schema versions (P).** `catalog/README.md` (schema v1 frozen for old apps), zod validation requiring https (`utils/modelCatalogSchema.ts`), remote → cache → bundled fallback with timeout (`utils/fetchModelCatalog.ts`); `test.yml` publishes the catalog when it changes.
→ The store-gap rule applied to content: exercises, prompt presets, follow-up templates served from Convex, never shown to a binary that can't render them.

**Native-binary hash lock (P).** `scripts/verify-native-libs.js` in `postinstall` SHA-256s downloaded native artifacts into `native-libs.lock.json` and fails on drift.
→ Supply-chain guard next to `security-audit.yml` if we ever pull binaries at install time (e.g. on-device models for Vault mode).

## Repo hygiene

**CODEOWNERS on safety-critical files (C).** `.github/CODEOWNERS` requires a foundation review for auth, OAuth, `eas.json`, `app.json`, exempting `*.test.*`.
→ Gate `escalation.ts`, `consent.ts`, `ai/safeguard.ts` and `crisis-resources` the same way.

**Weekly dependency bump PR with split permissions (R).** `.github/workflows/model-catalog-bump.yml`: the install/test job runs with no write permissions; only a non-executing job pushes.
→ For weekly AI SDK / Convex / Expo bumps.

**Smaller ones (C).**
- Delete PR caches on close: `.github/workflows/cache-clean.yml`.
- Path-based PR labels: `.github/labeler.yml` + `workflows/labeler.yml`.
- Per-platform bug templates: `.github/ISSUE_TEMPLATE/2-bug-ios.yml`, `3-bug-android.yml`.
