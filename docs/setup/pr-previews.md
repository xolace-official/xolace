# Per-PR backend previews (Convex + Vercel)

One-time setup so a PR can get **its own Convex backend** plus web and admin previews
that talk to it, written for someone new to monorepos. An agent can't do any of it
for you. Read [release.md](./release.md) and [staging.md](./staging.md) first: this
reuses the `xolace-staging` Convex project and the two Vercel projects from there.

> **Plan and cost, up front.** Convex preview deployments are available on every plan,
> Free/Starter included ([convex.dev/pricing](https://www.convex.dev/pricing)). What
> the plan changes:
>
> | | Free / Starter | Professional |
> |---|---|---|
> | Preview lifetime (deleted automatically after creation) | **5 days** | 14 days |
> | Deployments per team (every preview counts, as do dev and prod) | 40 | 300 |
>
> Each preview runs the real backend: AI calls (Anthropic, OpenAI, ElevenLabs) made
> from it spend real credits, the same as staging. Previews are opt-in per PR, so the
> cost is what reviewers actually use.

## Why this exists

A normal Vercel Preview of a PR runs the PR's web code against **staging**, which only
updates when a PR merges into `dev`. So a PR that adds a Convex function *and* the UI
calling it can't be reviewed from its preview link: the function isn't on staging yet.

With the `preview-backend` label, CI gives that PR its own backend built from the PR's
code, and web and admin previews pointed at it.

## How it fits together

```
add label "preview-backend" to a PR (or push to a PR that has it)
      │
      ▼
.github/workflows/pr-preview.yml  → job "deploy" (GitHub environment "preview")
  1. convex deploy --preview-name pr-<number>
       → a Convex *preview* deployment in project xolace-staging
         (created the first time, reused on later pushes, so its data survives)
     then seed: seedReflections, seedExercises, seedQuotes (idempotent)
  2. vercel deploy (web and admin, built on Vercel)
       with NEXT_PUBLIC_CONVEX_URL = that preview's URL
     then check the built site really uses that URL
  3. one PR comment (updated on every push) with the three links

remove the label, or close/merge the PR
      │
      ▼
job "cleanup": deletes the Convex preview (Convex Management API)
```

| You do | Convex | Web / admin | PR comment |
|---|---|---|---|
| Add `preview-backend` | preview `pr-<n>` created, seeded | CLI previews built against it | posted |
| Push to the PR (label on) | same preview updated with the new code, seeds re-run | new CLI previews | updated |
| Remove the label | preview deleted | old previews stay, with no backend | "Removed" |
| Close or merge (label on) | preview deleted | same | "Removed" |
| Re-add the label | a fresh, empty preview, seeded | new previews | updated |

- **Backend never depends on a client build.** Web and admin stay plain Next.js builds.
  The Convex key lives only in the GitHub `preview` environment; Vercel never sees it,
  and both builds still fail if a `CONVEX_DEPLOY_KEY` ever shows up there.
- **Vercel's own preview still happens.** Vercel keeps Git-deploying every PR push
  against staging, and its bot comment links those. For a labelled PR, use the links
  in the **"Backend preview"** comment instead.
- **Fork PRs get nothing.** The workflow runs on plain `pull_request` (never
  `pull_request_target`) and only for branches in this repo, so code from a fork never
  runs with these secrets.
- **Same Clerk as staging**: the development instance (`curious-kingfish-86`), so
  reviewers sign in with test accounts.
- **Mobile isn't covered** (see "Follow-ups").

## Before you start

- Staging is set up and green ([staging.md](./staging.md)): the `xolace-staging`
  Convex project exists and both Vercel projects deploy.
- Admin on the GitHub repo; Convex team `xolace-inc`; owner/member of the Vercel team
  that holds `xolace-web` and `xolace-admin`.

## Step 1: Create the label

GitHub repo → **Issues → Labels → New label**:

- Name: **`preview-backend`** (exactly; the workflow matches this string)
- Description: "Deploy this PR's backend to its own Convex preview"

Anyone who can label PRs (write or triage access) can start a preview.

## Step 2: Preview deploy key (Convex)

1. [dashboard.convex.dev](https://dashboard.convex.dev) → team `xolace-inc` → project
   **`xolace-staging`** (not `xolace-app`) → **Settings** (project settings) →
   **Preview Deploy Keys** → **Generate Preview Deploy Key**. Name it `github-pr-preview`.
2. It looks like `preview:xolace-inc:xolace-staging|…`. Check the middle part is
   `xolace-staging`: the workflow refuses any other project, any non-preview key, and
   anything mentioning prod (`energetic-guineapig-283`).

If the project's slug isn't exactly `xolace-staging` (the dashboard URL shows it), change
`PREVIEW_PROJECT` at the top of `.github/workflows/pr-preview.yml` to match.

A preview key can only create, update and delete **preview** deployments of that one
project. It can't touch staging's or prod's data.

## Step 3: Default environment variables for previews (Convex)

A new preview starts with the project's **default environment variables for the
Preview type**. Without them the very first deploy fails (the backend requires
`CLERK_JWT_ISSUER_DOMAIN` and `POSTHOG_PROJECT_TOKEN`).

`xolace-staging` → **Settings** (project) → **Environment Variables** (defaults) → pick
the **Preview** deployment type → add the variables. Use the same names and values as
staging ([staging.md](./staging.md) Step 4, all 28 names), with:

| Name | Preview value |
|---|---|
| `CLERK_JWT_ISSUER_DOMAIN` | Clerk dev issuer, `https://curious-kingfish-86.clerk.accounts.dev` (**required to deploy**) |
| `POSTHOG_PROJECT_TOKEN` | same as staging (**required to deploy**) |
| `CONVEX_ENV` | `development` (dev cron schedules; keeps previews cheap) |
| `RANK_MIN_POPULATION` | `1` or `3`, so ranks show with a single tester |
| `TALK_LLM_SECRET`, `REVENUECAT_WEBHOOK_AUTH`, `ELEVENLABS_WEBHOOK_SECRET` | any random value. Webhooks from ElevenLabs/RevenueCat/Stream never point at a preview |
| everything else | the staging value |

Or from a terminal where you're logged in to Convex (an agent must not run this):

```sh
cd packages/backend
# .env.preview-defaults: NAME=value lines. Don't commit it; delete it afterwards.
bunx convex env default set --project xolace-inc:xolace-staging --type preview --from-file .env.preview-defaults
# check (names only):
bunx convex env default list --project xolace-inc:xolace-staging --type preview --names-only
```

Defaults are copied **when a preview is created** and never synced after. If you change
one, existing previews keep the old value: remove and re-add the label on that PR to
recreate its preview.

## Step 4: Vercel token and project ids

1. **Token:** vercel.com → avatar → **Account Settings → Tokens → Create**. Scope: the
   team that owns `xolace-web` and `xolace-admin`. Expiration: your call (a year, with
   a reminder). Copy it.
2. **Team id:** team **Settings → General → Team ID** (`team_…`).
3. **Project ids:** `xolace-web` → **Settings → General → Project ID** (`prj_…`); same
   for `xolace-admin`.
4. **Optional, recommended: protection bypass.** If Deployment Protection is on
   (Vercel's default protects Preview URLs), the workflow can't open the preview to
   check it uses the right backend. Per project: **Settings → Deployment Protection →
   Protection Bypass for Automation → Add**. Copy each secret. Without them the check
   is skipped with a warning; the deploy still works.

## Step 5: GitHub `preview` environment

GitHub repo → **Settings → Environments → New environment** → **`preview`**.

- **Deployment branches and tags:** leave **No restriction**. PR runs use the PR's own
  ref, so a branch rule would block them.
- **Required reviewers:** none (each push would wait for a click). The label is the
  gate.
- **Environment secrets:**

  | Secret | Value |
  |---|---|
  | `CONVEX_PREVIEW_DEPLOY_KEY` | Step 2 |
  | `VERCEL_TOKEN` | Step 4.1 |
  | `VERCEL_BYPASS_SECRET_WEB` | Step 4.4, web (optional) |
  | `VERCEL_BYPASS_SECRET_ADMIN` | Step 4.4, admin (optional) |

- **Variables** (repo → Settings → Secrets and variables → Actions → **Variables**;
  repo-level or in the environment, either works; these aren't secret):

  | Variable | Value |
  |---|---|
  | `VERCEL_ORG_ID` | Step 4.2 |
  | `VERCEL_PROJECT_ID_WEB` | Step 4.3, web |
  | `VERCEL_PROJECT_ID_ADMIN` | Step 4.3, admin |

Don't put the Convex key anywhere else: not Vercel, EAS, or a `.env` file. Without the
Vercel secrets/variables, the workflow still deploys the backend and says so in the
comment.

## Step 6: Clerk

Nothing to change, as long as staging previews already sign in. The dev instance is
built for this: Clerk says to use **development keys** on a host's preview domain
(`*.vercel.app`), and production keys can't be used there. The CLI previews get the
same Preview env vars (`pk_test_…`, `sk_test_…`) as Vercel's Git previews.

If sign-in ever fails only on these previews, check the Clerk dev instance's
**Domains / allowed origins** and **redirect URLs** settings for a rule that excludes
`*.vercel.app`.

The backend side is Step 3's `CLERK_JWT_ISSUER_DOMAIN`, which must be the dev issuer.

## Step 7: Try it

1. Open (or pick) a PR from a branch in this repo. Add the **`preview-backend`** label.
2. **Actions → PR preview** runs **Deploy preview**. The first run takes a few minutes
   (Convex deploy, seeds, two Vercel builds in parallel).
3. The PR gets a **"Backend preview"** comment with:
   - Convex: `pr-<n>` → the deployment name (links to its dashboard; data is there)
   - Web and Admin: the preview URLs
4. Open Web, sign in with a Clerk test account, and check the Convex dashboard of that
   preview gets a `users` row.
5. Push a commit: the same comment updates; the Convex preview keeps its data.
6. Remove the label: **Delete preview backend** runs, the comment says "Removed", and
   the deployment disappears from the `xolace-staging` dashboard.

## How a reviewer uses it

- Look for the **"Backend preview"** comment (not the Vercel bot's). If it's not there,
  ask for the `preview-backend` label.
- Sign in with a Clerk **test** account. The data is the PR's own: seeded reflections,
  exercises and quotes, plus whatever you create. The Browse library and Kindling
  tracks are empty (their ingest scripts don't target previews).
- Want a clean slate? Remove and re-add the label.
- A preview untouched for 5 days (14 on Pro) is deleted by Convex; the next push
  recreates it, empty and re-seeded.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Nothing runs after labelling | The PR is from a fork (no previews by design), or the label isn't exactly `preview-backend`. |
| `CONVEX_PREVIEW_DEPLOY_KEY is missing or not a Convex *preview* deploy key` | Step 2 and Step 5: the secret must be in the `preview` environment and start with `preview:`. A `prod:`/`dev:` key is refused. |
| `belongs to project '…', not 'xolace-staging'` | The key is from another project (maybe prod's `xolace-app`). Make one in `xolace-staging`. If the slug really differs, update `PREVIEW_PROJECT` in the workflow. |
| Deploy fails on `CLERK_JWT_ISSUER_DOMAIN` / `POSTHOG_PROJECT_TOKEN` not set | Step 3 for the **Preview** type. Then remove and re-add the label, because a preview only copies defaults when it's created. |
| `Deployment limit reached` / can't create preview | The Convex team is at its deployment limit (40 on Free/Starter). Remove the label from PRs nobody is reviewing, or delete old previews in the dashboard. |
| Job stuck on "Waiting for review" or "branch not allowed" | Step 5: no reviewers and no branch restriction on `preview`. |
| `… not set; only the backend preview was deployed` | Step 4/5 Vercel secrets and variables. |
| Vercel deploy fails with missing `packages/…` | "Include files outside the root directory" is off for that project ([release.md](./release.md) Step 2). |
| `The web preview doesn't reference <host>` | Vercel built with the project's own Preview `NEXT_PUBLIC_CONVEX_URL` (staging) instead of the one the workflow passes (`--build-env`); Vercel doesn't document which wins, so the workflow checks. Two ways out: (a) on a Vercel plan with custom environments, add one (e.g. `pr-preview`) holding the Clerk test keys but **no** `NEXT_PUBLIC_CONVEX_URL`, and change the workflow's `--target=preview` to `--target=pr-preview`; or (b) build on the runner instead (`vercel pull` / `vercel build` / `vercel deploy --prebuilt` with the URL in the step env), which needs `CLERK_SECRET_KEY` (test) as a `preview` secret too, because Vercel won't hand out Sensitive values. |
| `Couldn't fetch the … preview to check its Convex URL` | Deployment Protection is on and Step 4.4 isn't set. Harmless; add the bypass secrets to enable the check. |
| Sign-in works but every call is "Unauthenticated" | The preview's `CLERK_JWT_ISSUER_DOMAIN` isn't the dev issuer (Step 3), then recreate the preview. |
| Cleanup says `… is a 'prod' deployment …, not this PR's preview. Refusing` | The comment pointed at a deployment that isn't this PR's preview. Nothing was deleted. Check the comment and delete the preview by hand in the dashboard. |
| Cleanup says "no Convex deployment was recorded" | The deploy never got far enough to record one. Convex deletes previews on its own after 5/14 days, or delete it in the dashboard. |

## Follow-ups (not built)

- **Mobile.** Preview builds bake `EXPO_PUBLIC_CONVEX_URL` in at build time and get
  updates on one `preview` channel, so they can't switch backends per PR without a
  per-PR channel (or a runtime backend switcher in a dev menu) plus an OTA per push.
  Worth doing once web previews prove useful.
- **Vercel preview cleanup.** The CLI previews of a closed PR stay until Vercel's
  deployment retention removes them. They're harmless (no backend), so the workflow
  doesn't call `vercel remove`.
- **Library and Kindling content** in previews: their ingest scripts only target your
  dev deployment or prod, the same gap as staging.
