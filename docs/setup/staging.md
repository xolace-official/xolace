# Staging setup (Convex, Vercel, EAS)

One-time setup for the **shared staging backend**, written for someone new to
monorepos. An agent can't do any of it for you. Read [release.md](./release.md) first:
staging is the same machinery pointed at a different Convex project.

## Why staging exists

Before this, web and admin Vercel **Preview** deploys and the EAS **`preview`** builds
all talked to one person's own Convex dev deployment (`groovy-mandrill-892`). Every
collaborator's preview wrote to it, and `convex dev` from that laptop could replace
the code under them. Staging is a deployment nobody develops against: only CI deploys
it, from `dev`.

## How it fits together

```
merge a PR into dev
      │
      ├─ .github/workflows/staging.yml
      │    1. backend: convex deploy → staging (project xolace-staging, Production deployment)
      │    2. mobile (opt-in): EAS preview-update workflow → OTA on channel "preview",
      │                        if mobile files changed
      │
      └─ Vercel (by itself): Preview deploy of xolace-web and xolace-admin,
                             reading NEXT_PUBLIC_CONVEX_URL = staging
```

| You do | Convex | Web / admin (Vercel) | Mobile |
|---|---|---|---|
| Open or push a PR | nothing | Preview deploy (against staging) | `native-change` label only |
| Merge into `dev` | **staging deployed** | Preview deploy (against staging) | preview OTA, if opted in and mobile files changed |
| Merge `dev` into `main` (a release) | **prod deployed** | Production deploy | release, if mobile files changed |

- **Staging is its own Convex project**, `xolace-staging`, and staging is that
  project's *Production* deployment. Prod stays `energetic-guineapig-283` in
  `xolace-app`. A separate project means a separate deploy key, separate data and
  separate env vars, and staging behaves like prod (no server errors sent to clients,
  only admins can edit it).
- **Same Clerk as dev.** Staging accepts the Clerk *development* instance
  (`curious-kingfish-86`, `pk_test_…`), so previews sign in with test accounts.
- **PR previews use staging too.** A PR's Vercel preview runs the PR's web code
  against the staging backend built from `dev`. If the PR adds a Convex function, the
  preview can't call it until the PR is merged; test those against your own dev
  deployment, or add the `preview-backend` label for a per-PR backend
  ([pr-previews.md](./pr-previews.md)).
- **Vercel may finish first.** Vercel builds the `dev` push at the same time as the
  workflow deploys Convex, so a preview can be live for a minute before the backend
  catches up. Acceptable for staging. Production avoids this with deploy hooks.
- The workflow refuses to deploy if its key is the prod key, and `release.yml` refuses
  to deploy if its key is anything but prod's.

## Before you start

- Convex dashboard access to team `xolace-inc` (admin, to create a project).
- Admin on the GitHub repo, access to both Vercel projects (`xolace-web`,
  `xolace-admin`) and the expo.dev project `xolace`.
- The values for the backend's env vars (Step 4). Most can be copied from the dev
  deployment `groovy-mandrill-892` (Dashboard → Settings → Environment Variables).

## Step 1: Create the `xolace-staging` project

1. [dashboard.convex.dev](https://dashboard.convex.dev) → team `xolace-inc` →
   **Create Project** → name it **`xolace-staging`**.
2. Pick a region. Staging is for testing, so the region closest to the team is fine;
   matching prod (US East) makes latency comparable.
3. Open the project and switch to its **Production** deployment (top bar). Note its
   name (two words and a number, like `happy-otter-123`) and its URL
   (`https://<name>.convex.cloud`, possibly with a region part). You need the URL in
   Steps 6 and 7.

## Step 2: Staging deploy key → GitHub

1. In `xolace-staging`, on the **Production** deployment: **Settings → URL & Deploy
   Key → Generate Production Deploy Key**. It looks like `prod:<name>|…`, and `<name>`
   must be the staging deployment from Step 1, **not** `energetic-guineapig-283`.
   **Permissions:** deploy, plus **run internal actions**. The seed functions
   (`seed:seedReflections`, `seed:seedExercises`, `seed:seedQuotes`) are internal
   actions; without that permission the seed step fails with
   `deployment:functions:runInternalActions`.
2. GitHub repo → **Settings → Environments → New environment** → name it
   **`staging`**.
   - **Deployment branches and tags:** "Selected branches and tags" → add `dev`.
   - No required reviewers: staging should deploy on every merge without a click.
3. In that environment → **Environment secrets → Add secret**: `CONVEX_DEPLOY_KEY`,
   paste the key. Don't save it anywhere else (not Vercel, EAS or a `.env` file).

Two environments, two secrets with the same name: `production` holds prod's key,
`staging` holds staging's. Each workflow only reads its own.

## Step 3: Clerk issuer

Staging uses the Clerk **development** instance. Its JWT issuer (the "Frontend API
URL") is `https://curious-kingfish-86.clerk.accounts.dev`; confirm it in the Clerk
dashboard → dev instance → **Configure → API keys** (or the Convex integration page).
You set it as `CLERK_JWT_ISSUER_DOMAIN` in Step 4. The Clerk dev instance already has
the `convex` JWT template (the dev deployment uses it), so nothing changes in Clerk.

## Step 4: Staging Convex environment variables

`xolace-staging` → Production deployment → **Settings → Environment Variables**. Set
these **before the first deploy**: the deploy fails without the two marked
"required to deploy".

Every name the backend reads (from `packages/backend/convex`, including
`auth.config.ts`, `convex.config.ts` and the components it mounts). "Dev value OK"
means you can copy the value from the dev deployment `groovy-mandrill-892`.

### Core

| Name | Purpose | Value for staging |
|---|---|---|
| `CLERK_JWT_ISSUER_DOMAIN` | Which Clerk instance's tokens are accepted (`auth.config.ts`). **Required to deploy.** | Clerk dev issuer (Step 3) |
| `POSTHOG_PROJECT_TOKEN` | PostHog component project token. **Required to deploy.** | Dev value OK (or a staging PostHog project) |
| `POSTHOG_HOST` | PostHog API host. Optional | Dev value OK |
| `POSTHOG_PERSONAL_API_KEY` | PostHog feature-flag evaluation. Optional | Dev value OK |
| `POSTHOG_FLAGS_POLLING_INTERVAL_SECONDS` | How often flags refresh. Optional | Dev value OK, or leave unset |
| `CONVEX_ENV` | `production` or `development`; picks cron intervals and gates the nightly quote job | **`development`** (keeps staging cheap; `production` would run prod schedules) |

### AI and voice

| Name | Purpose | Value for staging |
|---|---|---|
| `ANTHROPIC_API_KEY` | All text model calls (`convex/ai/`) | Dev value OK. Spends Anthropic credits |
| `OPENAI_API_KEY` | Embeddings (RAG) and moderation | Dev value OK. Spends OpenAI credits |
| `ELEVENLABS_VOICE_API_KEY` | Text-to-speech, vent and dictation | Dev value OK |
| `ELEVENLABS_AGENTS_API_KEY` | Companion talks (ElevenLabs agents) | Dev value OK |
| `TALK_AGENT_ID` | ElevenLabs agent used for talks | Dev value OK |
| `TALK_LLM_SECRET` | Bearer secret ElevenLabs sends to the talk LLM endpoint | New random value; the ElevenLabs agent pointed at staging must send the same |
| `ELEVENLABS_WEBHOOK_SECRET` | Verifies ElevenLabs post-call webhooks | Only if you add a webhook for staging's URL in ElevenLabs |
| `ELEVENLABS_DAILY_CAP_MINUTES_FREE` | Daily voice cap, free users. Optional (default 2) | Leave unset |
| `ELEVENLABS_DAILY_CAP_MINUTES_PLUS` | Daily voice cap, Plus users. Optional (default 8) | Leave unset |
| `DICTATION_DAILY_CAP_MINUTES_PLUS` | Daily dictation cap, Plus users. Optional | Leave unset |

The talk agent (`TALK_AGENT_ID`) also needs the pronunciation dictionary
[`elevenlabs/xolace-pronunciation.pls`](./elevenlabs/xolace-pronunciation.pls), so its
voice says "Xolace" like "solace" while the text keeps the real spelling. Upload it in
the agent's **Voice settings** in ElevenLabs. Every agent needs it, prod's included.

### Integrations

| Name | Purpose | Value for staging |
|---|---|---|
| `STREAM_API_KEY` | Stream Chat (Xolacer chat) | Dev Stream app OK |
| `STREAM_API_SECRET` | Stream Chat server secret | Dev Stream app OK |
| `REVENUECAT_WEBHOOK_AUTH` | Authorizes RevenueCat webhooks (32+ chars) | New random value; only matters if RevenueCat sends sandbox events to staging |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 (audio tracks) | Dev bucket OK |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 | Dev bucket OK |
| `R2_ENDPOINT` | Cloudflare R2 | Dev bucket OK |
| `R2_BUCKET` | Cloudflare R2 bucket name | Dev bucket OK (a separate staging bucket is cleaner) |

### Feature switches (all optional)

| Name | Purpose | Value for staging |
|---|---|---|
| `DEV_TOOLS_ENABLED` | Turns on `convex/devTools.ts` helpers | `true` if testers need them; never on prod |
| `PREMIUM_DEV_OVERRIDE` | Everyone gets Plus | Leave unset (test real gating) or `true` for a demo |
| `KINDLING_DEV_UNLIMITED` | Lifts the one-kindling-per-day limit | Leave unset |
| `RANK_MIN_POPULATION` | Minimum population before percentiles show (default 50) | A small number like `3`, so ranks show with few testers |
| `XOLACER_CHAT_ENABLED` | Xolacer chat kill switch | Match dev |

That's **28 names**. Not in the list on purpose: `CONVEX_SITE_URL` (Convex sets it),
and `EVAL_OUT` / `TALK_EVAL_MODEL` (local eval runs only).

Never use a `sk_live_`/production secret here. Staging is a test environment.

## Step 5: (Optional) automatic mobile preview OTAs

Off by default, because each OTA spends EAS quota. To turn it on: GitHub repo →
**Settings → Secrets and variables → Actions → Variables → New repository variable**:
`STAGING_MOBILE_OTA` = `true`. It also needs the `EXPO_TOKEN` repo secret, which
[release.md Step 6](./release.md#step-6-github-secrets-for-the-clients) already set up.

With it on, each merge into `dev` that touches `apps/mobile`, `package.json`,
`bun.lock` or `patches/` runs `apps/mobile/.eas/workflows/preview-update.yml`: an
OTA to the `preview` channel, built with the EAS `preview` environment. It reaches
installed `preview` builds with the same app version.

## Step 6: Point Vercel Previews at staging

In **both** `xolace-web` and `xolace-admin`: **Settings → Environment Variables** →
`NEXT_PUBLIC_CONVEX_URL` → edit the **Preview** value to the staging URL from Step 1.
Leave Production alone. The Clerk Preview values (`pk_test_…`, `sk_test_…`) stay as
they are.

Existing preview deployments keep the old URL until they rebuild (env vars are read at
build time). Push to `dev` or **Redeploy** the latest preview.

## Step 7: Point EAS `preview` at staging

expo.dev → project `xolace` → **Environment variables** → `EXPO_PUBLIC_CONVEX_URL` →
set the **preview** environment's value to the staging URL. Leave `development` and
`production` alone.

Already-installed `preview` builds keep the URL they were built or last updated with.
They switch on the next preview OTA (Step 5 or a manual
`bunx eas-cli workflow:run preview-update.yml`) or a new preview build.

## Step 8: First run

1. GitHub → **Actions → Staging → Run workflow**, branch `dev`, tick **seed**, mobile
   `skip` (or `auto`).
2. `Deploy Convex (staging)` deploys the code, then **Seed curated content** runs
   `seed:seedReflections`, `seed:seedExercises` and `seed:seedQuotes`. All three are
   safe to re-run: reflections skip existing text, exercises update by title, quotes
   skip when the library has any rows.
3. The Browse library and Kindling tracks stay empty. Their ingest scripts
   (`packages/backend/scripts/library/ingest.ts`, `scripts/kindling/ingest.ts`) only
   know "your dev deployment" and `--prod` (the real prod deployment), not staging,
   and they need local media and spend OpenAI credits. Don't point them at staging
   by hand until they grow a staging target; that's a follow-up.

After that, every merge into `dev` deploys staging by itself. Seed again only after
wiping staging.

## Step 9: Verify

- **Actions → Staging**: the latest run on `dev` is green; the log shows
  `Deploying to staging deployment <your staging name>`.
- Convex dashboard → `xolace-staging` → **Deployments/History** shows a push with the
  message `staging <commit sha>`. `xolace-app` prod shows nothing new.
- Open the newest Vercel **Preview** of web, sign in with a Clerk test account, and
  check `xolace-staging` → **Data** → `users` gets a row. Same for admin.
- With Step 5 on: expo.dev shows the `preview-update` workflow run and an update on
  the `preview` channel; a `preview` build picks it up after a restart or two.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `staging environment's CONVEX_DEPLOY_KEY secret is missing or not a production deploy key` | Step 2: the secret must be in the `staging` environment and start with `prod:`. A `dev:` or `preview:` key is refused. |
| `You do not have permission to perform this operation (deployment:functions:runInternalActions)` | The seed step: the key lacks "run internal actions". Generate a new staging key with it (Step 2) and replace the GitHub secret. |
| `CONVEX_DEPLOY_KEY is the PROD key` | You pasted prod's key into `staging`. Replace it with the `xolace-staging` key, and check prod's key didn't leak anywhere else. |
| Release fails with `not the prod deployment … (a staging key?)` | The `production` environment holds the staging key. Put prod's key back (release.md Step 1). |
| Deploy fails on `CLERK_JWT_ISSUER_DOMAIN is not set` or a missing `POSTHOG_PROJECT_TOKEN` | Step 4: set them on the staging deployment, then re-run the workflow. |
| Job waits forever on "Waiting for review" | The `staging` environment has required reviewers. Remove them (Step 2). |
| `Deployment branch not allowed` | Add `dev` to the `staging` environment's deployment branches (Step 2). |
| Preview signs in but every call is "Unauthenticated" | `CLERK_JWT_ISSUER_DOMAIN` on staging isn't the dev Clerk issuer, or the preview uses a different Clerk key. |
| Preview still talks to `groovy-mandrill-892` | Step 6 not saved for **Preview**, or the preview was built before the change. Redeploy. |
| Preview briefly errors with "Could not find public function" after a merge | Vercel finished before the backend. Wait for the Staging run, then reload. |
| Mobile job is skipped | `STAGING_MOBILE_OTA` isn't `true` (Step 5), or no mobile files changed (use Run workflow with mobile `always`). |
| `The EXPO_TOKEN secret is not set` | release.md Step 6. |
