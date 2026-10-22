# Release (stub: Phase 3)

Release pipelines don't exist yet. Until they do, **nothing is released by an agent**:
no `convex deploy`, no `eas build --profile production`, no `eas update` to a
production channel, no `vercel deploy --prod`, no desktop tags.

Planned shape (see `docs/plan/workspace-migration-plan.md` Phase 3):

- **Order: backend first, then clients.** Each release job runs `convex deploy` before
  any OTA or web deploy, and the backend must stay compatible with mobile binaries
  already in users' hands (store-gap rule, `packages/backend/AGENTS.md`).
- **Mobile:** PR fingerprint check labels native changes. On merge, an EAS Workflow
  runs `fingerprint` → `get-build` on the production channel: compatible store build
  → JS ships as `eas update`; otherwise build + submit to TestFlight / Play internal.
  Production `runtimeVersion.policy: fingerprint`; dev/preview keep `appVersion`.
- **Convex:** deployed from one place only: the web Vercel build
  (`convex deploy --cmd 'turbo run build -F @xolace/web'`). Admin never deploys Convex.
- **Desktop:** tag-triggered `tauri build` + updater, real CSP allowing
  `*.convex.cloud` and the Clerk domain.
- **Evals:** live intensity/talk eval gates carried over for `convex/ai/**`.

Fill this file in when the pipelines land.
