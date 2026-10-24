# Release setup (Convex, Vercel, EAS)

One-time setup for releasing the backend, web, admin and mobile, written for someone
new to monorepos. An agent can't do any of it for you. Previews and the shared staging
backend (deployed on every merge into `dev`) have their own guide:
[staging.md](./staging.md).

## How it fits together

One GitHub repo. The **backend releases on its own**, from a GitHub Actions workflow;
web, admin and mobile are clients that release *after* it.

```
merge dev → main
      │
      ▼
.github/workflows/release.yml
  1. backend: convex deploy → prod (energetic-guineapig-283)   ← the ONLY Convex deploy
  2. then, in parallel:
     ├─ mobile: EAS release workflow (OTA or store build), if mobile files changed
     ├─ web:    Vercel deploy hook  → project "xolace-web"   (Root Directory apps/web)
     └─ admin:  Vercel deploy hook  → project "xolace-admin" (Root Directory apps/admin)
```

- **Two Vercel projects, one repo.** Each project points at a different folder (its
  *Root Directory*), and each folder has its own `vercel.json` saying how to build it.
  Each build installs the whole repo (bun workspaces need it) and builds only its app.
- **Web and admin never deploy Convex.** They're plain Next.js builds that read
  `NEXT_PUBLIC_CONVEX_URL` from their Vercel settings. Both builds fail if a Convex
  deploy key is ever added to them.
- **Vercel doesn't deploy `main` by itself.** Each `vercel.json` turns off Git deploys
  of `main` (`git.deploymentEnabled`), so Production only updates when the release
  workflow calls its deploy hook, after the backend is live.
- If the Convex deploy fails, nothing else ships. If web's build fails, the backend
  and mobile are unaffected.

What triggers what:

| You do | Convex | Web / admin (Vercel) | Mobile |
|---|---|---|---|
| Open or push a PR | nothing | Preview deploy (against staging) | `native-change` label only |
| Merge into `dev` | **staging** deployed ([staging.md](./staging.md)) | Preview deploy (against staging) | preview OTA, if opted in |
| Merge `dev` into `main` (a release) | **prod deployed** | **Production** deploy | release, if mobile files changed |

Merging `dev` into `main` **is** the release. The first one also replaces whatever the
old repo deployed to prod Convex; after that, never deploy Convex from the old
`xolace_mobile_app` repo again.

## Before you start

- Admin access to the GitHub repo, Vercel team access (with the Vercel GitHub app able
  to see `xolace-official/xolace`), and expo.dev access to the `xolace` project.
- Convex dashboard access to the `xolace-app` project (team `xolace-inc`). Prod:
  `energetic-guineapig-283`. Previews use the staging deployment in the separate
  `xolace-staging` project ([staging.md](./staging.md)), not anyone's dev deployment.
- Clerk: the production instance (domain `clerk.xolaceinc.com`, keys `pk_live_…` /
  `sk_live_…`) and the dev instance (`curious-kingfish-86`, keys `pk_test_…` /
  `sk_test_…`).
- Domain names for the two apps. This guide uses `app.xolaceinc.com` and
  `admin.xolaceinc.com`. Clerk's production keys only work on your own domain, not on
  `*.vercel.app`.

## Step 1: Convex deploy key → GitHub

1. Convex dashboard → project `xolace-app` → switch to the **Production** deployment →
   **Settings** → **URL & Deploy Key** → **Generate Production Deploy Key**. It starts
   with `prod:`.
2. GitHub repo → **Settings → Environments → New environment** → name it
   **`production`**.
   - Optional but recommended: **Required reviewers** (you), so each release waits
     for a click before touching prod. **Deployment branches**: "Selected branches"
     → `main`.
3. In that environment → **Environment secrets → Add secret**: `CONVEX_DEPLOY_KEY`,
   paste the key. Don't save it anywhere else.

The release refuses any key that doesn't name `energetic-guineapig-283`, so the
staging key (also a `prod:` key, of `xolace-staging`) can't deploy here by mistake.

## Step 2: Create the web project in Vercel

1. Vercel → **Add New… → Project** → import `xolace-official/xolace`.
2. **Project Name:** `xolace-web`. **Root Directory:** click **Edit**, pick `apps/web`.
3. **Framework Preset:** Next.js (detected). **Build and Output Settings:** leave
   every override off; `apps/web/vercel.json` sets the install and build commands.
4. Add the environment variables (Step 3) before the first deploy if Vercel lets you.
   If it deploys anyway and fails, that's harmless.
5. After it's created, go to **Settings**:
   - **Build and Deployment → Root Directory:** make sure "Include files outside the
     root directory in the Build Step" is **on** (the build needs `packages/` and the
     root `bun.lock`).
   - **Environments → Production → Branch Tracking:** set the branch to **`main`**.
     GitHub's default branch is `dev`, and Vercel uses the default branch for
     Production unless you change this.
   - **Git → Deploy Hooks:** create a hook named `release`, branch `main`. Copy the
     URL (Step 6). Anyone with it can deploy, so treat it like a password.

## Step 3: Web environment variables

Settings → **Environment Variables**. Each variable is added per environment; untick
the ones a row doesn't belong to.

| Name | Production | Preview |
|---|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | `https://energetic-guineapig-283.convex.cloud` | the staging URL ([staging.md](./staging.md) Step 1) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_…` | `pk_test_…` |
| `CLERK_SECRET_KEY` | `sk_live_…` (Sensitive) | `sk_test_…` (Sensitive) |

Never add `CONVEX_DEPLOY_KEY` here; the build refuses it. Leave Development empty;
local dev uses your `.env` files.

## Step 4: Web domain

Settings → **Domains** → add `app.xolaceinc.com` and follow the DNS instructions
(a CNAME to Vercel). In the **Clerk production** dashboard, check the domain is allowed
so sign-in works there.

## Step 5: Create the admin project

Same as Steps 2–4, with **Project Name** `xolace-admin`, **Root Directory**
`apps/admin`, the same three variables with the same values, its own `release` deploy
hook on `main`, and the domain `admin.xolaceinc.com`. Consider **Settings → Deployment
Protection** so preview admin URLs need a Vercel login.

## Step 6: GitHub secrets for the clients

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
|---|---|
| `VERCEL_DEPLOY_HOOK_WEB` | web's deploy hook URL (Step 2) |
| `VERCEL_DEPLOY_HOOK_ADMIN` | admin's deploy hook URL (Step 5) |
| `EXPO_TOKEN` | expo.dev → account/organization settings → **Access tokens** → a robot token |

A missing hook only skips that app (with a warning in the run); a missing
`EXPO_TOKEN` fails the mobile job.

## Step 7: First release and checks

1. Push any commit to `dev`. Both Vercel projects make a **Preview** deploy; open them
   (sign-in uses the dev Clerk instance).
2. When ready, merge `dev` into `main`. Open **Actions → Release**:
   - `Deploy Convex (prod)` runs first (after your approval, if you set reviewers).
   - Then `Start EAS mobile release`, `Deploy web`, `Deploy admin` run.
3. Check Vercel shows a new Production deployment for each project, created by a deploy
   hook, and expo.dev shows the EAS workflow run.

To re-run a release by hand: **Actions → Release → Run workflow** on `main`. The
`mobile` input picks `auto` (only if mobile files changed), `always` or `skip`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `CONVEX_DEPLOY_KEY secret is missing or not a production key` | Step 1: the secret must be in the `production` environment and start with `prod:`. |
| `CONVEX_DEPLOY_KEY is for …, not the prod deployment` | The `production` environment holds another project's key (likely staging's). Put prod's key back (Step 1). |
| `[web] / [admin] CONVEX_DEPLOY_KEY is set` in a Vercel build | Delete the key from that Vercel project. |
| Vercel can't find `packages/…` or `bun.lock` | Turn on "Include files outside the root directory" (Step 2.5). |
| Vercel deployed Production straight from a push | Production branch isn't `main`, or `git.deploymentEnabled` was removed from that app's `vercel.json`. |
| `VERCEL_DEPLOY_HOOK_… is not set` warning | Step 6. |
| Mobile job says "no mobile-relevant changes" | Expected for backend- or web-only releases. Use Run workflow with `mobile: always` to force one. |
| Clerk sign-in fails on the production domain | The domain isn't allowed in the Clerk production instance (Step 4). |
