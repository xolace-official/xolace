# Vercel setup (web + admin)

One-time setup for deploying `apps/web` and `apps/admin`, written for someone new to
monorepos. Nothing here is automated; an agent can't do it for you.

## How it fits together

One GitHub repo, **two Vercel projects**. Each project points at a different folder
(its *Root Directory*), and each folder has its own `vercel.json` saying how to build it.

```
xolace-official/xolace (GitHub)
├── apps/web    ──►  Vercel project "xolace-web"    ──► app.xolaceinc.com
│                    build: convex deploy, then build web
├── apps/admin  ──►  Vercel project "xolace-admin"  ──► admin.xolaceinc.com
│                    build: build admin only
└── packages/backend (Convex) ◄── deployed ONLY by the web project's build
```

- **Every push builds both projects.** Each one installs the whole repo (bun
  workspaces need it), then builds only its own app through Turborepo.
- **Web deploys Convex first.** `apps/web/scripts/vercel-build.ts` runs `convex deploy`
  from `packages/backend`. Convex then runs the web build with
  `NEXT_PUBLIC_CONVEX_URL` set to the deployment it just updated. If the Convex deploy
  fails, web doesn't ship.
- **Admin never deploys Convex.** It reads `NEXT_PUBLIC_CONVEX_URL` from its own env
  and fails its build if a deploy key is ever added to it.
- **Mobile goes after the backend.** When a web *Production* deploy succeeds, GitHub
  sends a `deployment_status` event, and `.github/workflows/mobile-release.yml` starts
  the EAS release (OTA update or store build).

What triggers what:

| You do | Web (Vercel) | Admin (Vercel) | Convex | Mobile |
|---|---|---|---|---|
| Open or push a PR | Preview deploy | Preview deploy | see "Preview" below | nothing (fingerprint label only) |
| Merge into `dev` | Preview deploy | Preview deploy | see "Preview" below | nothing |
| Merge `dev` into `main` (a release) | **Production** deploy | **Production** deploy | **prod deployed** | release workflow starts |

Merging `dev` into `main` **is** the release. The first one after this setup also
pushes the monorepo backend to prod Convex, replacing whatever the old repo deployed.
After that, never deploy Convex from the old `xolace_mobile_app` repo again.

## Before you start

- Vercel team access, with the Vercel GitHub app able to see `xolace-official/xolace`.
- Convex dashboard access to the `xolace-app` project (team `xolace-inc`).
  Prod deployment: `energetic-guineapig-283`. Shared dev/preview deployment:
  `groovy-mandrill-892`.
- Clerk: the production instance (domain `clerk.xolaceinc.com`, keys `pk_live_…` /
  `sk_live_…`) and the dev instance (`curious-kingfish-86`, keys `pk_test_…` /
  `sk_test_…`).
- Domain names for the two apps. This guide uses `app.xolaceinc.com` and
  `admin.xolaceinc.com`. Clerk's production keys only work on your own domain, not on
  `*.vercel.app`.

## Step 1: Get the Convex production deploy key

1. Convex dashboard → project `xolace-app` → switch to the **Production** deployment.
2. **Settings** → **URL & Deploy Key** → **Generate Production Deploy Key**.
3. Copy it (it starts with `prod:`). Don't save it anywhere but Vercel (Step 3).

Preview deploy keys are covered under "Preview" below. Start without one.

## Step 2: Create the web project

1. Vercel → **Add New… → Project** → import `xolace-official/xolace`.
2. **Project Name:** `xolace-web`.
3. **Root Directory:** click **Edit**, pick `apps/web`.
4. **Framework Preset:** Next.js (detected).
5. **Build and Output Settings:** leave every override off. `apps/web/vercel.json`
   sets the install command (`bun install` from the repo root) and the build command.
6. **Environment Variables:** skip for now (Step 3), and **don't** click Deploy
   yet if Vercel lets you continue without it. If it deploys anyway, that first build
   fails on the missing key. That's harmless; nothing reaches Convex.
7. After it's created, go to **Settings**:
   - **Build and Deployment → Root Directory:** make sure "Include files outside the
     root directory in the Build Step" is **on** (the build needs `packages/backend`
     and the root `bun.lock`).
   - **Environments → Production → Branch Tracking:** set the branch to **`main`**.
     This matters: GitHub's default branch is `dev`, and Vercel picks the default
     branch for Production unless you change it. With `dev` there, every merge to
     `dev` would deploy prod Convex.

## Step 3: Web environment variables

Settings → **Environment Variables**. Each variable is added per environment; untick
the ones a row doesn't belong to.

| Name | Production | Preview |
|---|---|---|
| `CONVEX_DEPLOY_KEY` | the `prod:` key from Step 1 | **don't add** (see "Preview") |
| `NEXT_PUBLIC_CONVEX_URL` | **don't add** (the deploy sets it) | `https://groovy-mandrill-892.convex.cloud` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_…` | `pk_test_…` |
| `CLERK_SECRET_KEY` | `sk_live_…` (Sensitive) | `sk_test_…` (Sensitive) |

Never add `CONVEX_DEPLOYMENT`; the build refuses it. Leave the Development
environment empty; local dev uses your `.env` files.

## Step 4: Web domain

Settings → **Domains** → add `app.xolaceinc.com` and follow the DNS instructions
(a CNAME to Vercel). Then in the **Clerk production** dashboard, check that this domain
is allowed (Domains / allowed origins) so sign-in works there.

## Step 5: Create the admin project

Same as Step 2, with these differences:

- **Project Name:** `xolace-admin`. **Root Directory:** `apps/admin`.
- Same settings: "Include files outside the root directory" on, Production branch
  `main`.
- Environment variables:

| Name | Production | Preview |
|---|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | `https://energetic-guineapig-283.convex.cloud` | `https://groovy-mandrill-892.convex.cloud` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_…` | `pk_test_…` |
| `CLERK_SECRET_KEY` | `sk_live_…` (Sensitive) | `sk_test_…` (Sensitive) |

- **No `CONVEX_DEPLOY_KEY`**, ever. The admin build fails if it sees one.
- Domain: `admin.xolaceinc.com`. Consider Vercel's Deployment Protection
  (Settings → Deployment Protection) so preview admin URLs need a Vercel login.

## Step 6: GitHub secret and variable for the mobile release

Repo → **Settings → Secrets and variables → Actions**:

1. **Secrets → New repository secret:** `EXPO_TOKEN`. Create it at expo.dev →
   account/organization settings → **Access tokens** → a robot token for the
   `xolace` project.
2. **Variables → New repository variable:** `VERCEL_WEB_PRODUCTION_ENVIRONMENT`.
   You'll fill it in after the first web Production deploy (Step 7), because its
   value is the environment name Vercel reports to GitHub. While it's unset, no
   deploy starts a mobile release, which is a safe default.

## Step 7: First deploys and checks

1. Push any commit to `dev` (or redeploy from Vercel). Both projects make a
   **Preview** deploy. Open them; sign-in uses the dev Clerk instance.
   In the web build log you should see
   `[vercel-build] preview without CONVEX_DEPLOY_KEY: building against NEXT_PUBLIC_CONVEX_URL, no Convex deploy.`
2. When you're ready to release, merge `dev` into `main`. The web build log shows
   `convex deploy` running against prod, then the Next build.
3. On GitHub, open the repo's **Deployments** (right sidebar of the repo home page,
   or `https://github.com/xolace-official/xolace/deployments`). Find the web project's
   Production environment name (for example `Production – xolace-web`) and copy it
   exactly into the `VERCEL_WEB_PRODUCTION_ENVIRONMENT` variable from Step 6.
4. From then on, each web Production deploy starts **Actions → Mobile release**. For
   the release you just made, start it by hand: Actions → Mobile release →
   **Run workflow** on `main`.

## Preview: per-branch Convex deployments (optional, later)

By default (the setup above), web previews read the shared `groovy-mandrill-892`
deployment and deploy nothing to Convex. That's fine as long as a PR doesn't change
the backend, which is the case for UI-only PRs.

To let each PR get its own throwaway backend instead:

1. Check your Convex plan includes preview deployments.
2. Convex dashboard → project settings → **Generate Preview Deploy Key** (starts with
   `preview:`), and add it to the **web** project's Preview env as `CONVEX_DEPLOY_KEY`.
3. Remove `NEXT_PUBLIC_CONVEX_URL` from the web project's Preview env.
4. Convex project settings → **Default Environment Variables** for preview
   deployments: add every env var the backend needs (`CLERK_JWT_ISSUER_DOMAIN`,
   `POSTHOG_PROJECT_TOKEN`, model API keys, …). A preview deployment starts empty, and
   the push fails without them.

Each web preview then gets a Convex deployment named after its git branch, empty of
data.

## Troubleshooting

| Symptom in the build log | Fix |
|---|---|
| `CONVEX_DEPLOY_KEY is not set for Vercel production` | Add the `prod:` key to web's Production env (Step 3). |
| `CONVEX_DEPLOY_KEY is not a prod key` / `not a preview key` | The key is ticked for the wrong environment. |
| `[admin] CONVEX_DEPLOY_KEY is set` | Delete the key from the admin project. |
| Can't find `packages/backend` or `bun.lock` | Turn on "Include files outside the root directory" (Step 2.7). |
| Production deployed from `dev` | Production branch isn't `main` (Step 2.7). |
| Mobile release didn't start | `VERCEL_WEB_PRODUCTION_ENVIRONMENT` missing or not an exact match (Step 7.3); `EXPO_TOKEN` missing. Check Actions → Mobile release logs. |
| Clerk sign-in fails on the production domain | The domain isn't allowed in the Clerk production instance (Step 4). |
