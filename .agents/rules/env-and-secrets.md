# Env and secrets (decision D4)

Values live in the platform that runs the code. The repo holds **names only**.

| Surface | Values live in | Names documented in |
|---|---|---|
| mobile | EAS env (file env vars for `google-services.json` etc.) | `apps/mobile/.env.example` |
| backend | Convex env (`convex env set`, per deployment) | `packages/backend/.env.example` |
| web, admin | Vercel env | `apps/{web,admin}/.env.schema` (varlock) |
| cli | varlock | `apps/cli/.env.example` |
| docs | none needed | — |

## Rules

- Never commit a value: `.env*` files (except `.env.example` / `.env.schema`),
  `google-services.json`, `GoogleService-Info.plist`, `*firebase-adminsdk*.json`,
  service-account JSON, deploy keys, `CLERK_SECRET_KEY`. `.gitignore` covers the known
  names; check `git status` before every commit anyway.
- Public prefixes are public: `EXPO_PUBLIC_*` and `NEXT_PUBLIC_*` ship in bundles. Put
  only publishable keys and URLs there.
- No secrets in `postinstall` or any install step: EAS and CI install without them.
- Don't print env values in logs, test output, PR bodies or chat. Refer to names.
- Prod builds must fail on test config: E2E/seed/mock flags set, a non-`pk_live_`
  Clerk key, a non-prod Convex URL, or a secret-looking `EXPO_PUBLIC_*` value.

## Local files and worktrees

- `bun run setup:worktree` symlinks `.env` / `.env.local` from the main worktree.
  Editing a symlink edits the main worktree's file: if this worktree needs different
  values, `rm` the link and `cp` the main file in its place first.
- `packages/backend/.env.local` is never linked: the Convex CLI writes
  `CONVEX_DEPLOYMENT` there, and each worktree needs its own dev deployment.
- Point app `*_CONVEX_URL` values at your worktree's dev deployment when you run the
  backend and an app together.

## Adding a variable

1. Add the name to the right `.env.example` / `.env.schema` (with type for varlock).
2. Set the value in the platform (EAS / Convex / Vercel) for each environment, or ask
   a maintainer to; agents don't set prod values.
3. If a turbo task reads it, add it to that task's `env` in `turbo.json`.
