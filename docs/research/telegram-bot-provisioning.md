# Telegram bot provisioning per Convex deployment

Researched 2026-11-10 for [#738](https://github.com/xolace-official/xolace/issues/738)
(map [#723](https://github.com/xolace-official/xolace/issues/723)). Bot API at
**10.4** (2026-11-09) when read. Convex CLI 1.49.0. Facts only; no decisions.

Already settled, not repeated here: transport (copy, [#724](https://github.com/xolace-official/xolace/issues/724)),
delivery semantics and "one webhook per bot, so one bot per deployment"
([#725](https://github.com/xolace-official/xolace/issues/725)).

Tags: **[V]** read on the cited primary source today; **[R]** read in this repo;
**[U]** not confirmed by a primary source (community knowledge or inference).

## Summary

1. **A bot is created by a human**, in @BotFather (chat or its Mini App). Everything
   *about* the bot except its username can then be set by code: commands, name,
   description, short description, photo, menu button. A "manager" bot can also create
   bots, but each one still needs a person to tap a creation link.
2. **`secret_token`**: 1–256 chars of `A-Za-z0-9_-`, echoed in the
   `X-Telegram-Bot-Api-Secret-Token` header of every webhook request. It is the only
   authentication Telegram gives the webhook. Telegram publishes source IP ranges, but
   says they may change, and a Convex HTTP action can't see a trusted client IP anyway.
3. **One URL per bot.** `setWebhook` replaces whatever was set before (from any
   deployment), and the old deployment silently stops receiving updates. No documented
   rate limit on `setWebhook`.
4. **Every Convex deployment, previews and per-worktree dev included, has its own
   `https://<name>.convex.site`**, known at runtime as `CONVEX_SITE_URL`. Env vars are
   per deployment; previews get the project's Preview-type defaults **copied once at
   creation**, so every `pr-<n>` would start with the same bot token unless something
   changes it.
5. **The test environment works for bots** but needs a separate Telegram account
   (phone-number login on a test server), a separate bot from the test @BotFather, and
   API calls on `.../bot<token>/test/METHOD`. Flood limits are not relaxed there.

## 1. Creating and configuring a bot

**Creation is manual.** "Use the `/newbot` command to create a new bot." Usernames are
5–32 chars, Latin letters/digits/underscore, must end in `bot`, and can't be changed
later. BotFather returns the token; `/token` regenerates it, `/deletebot` deletes the
bot and frees the username. BotFather also has a Mini App with the same functions.
[V] [bots/features#creating-a-new-bot](https://core.telegram.org/bots/features#creating-a-new-bot),
[#edit-bots](https://core.telegram.org/bots/features#edit-bots),
[#botfather](https://core.telegram.org/bots/features#botfather)

There is no Bot API method that creates a bot from nothing. [V] (no such method in
[bots/api](https://core.telegram.org/bots/api))

**Managed bots** (newer): a bot with "Bot Management Mode" on (set in the BotFather
Mini App) can share `https://t.me/newbot/{manager_bot_username}/{new_username}?name={new_name}`
or a `KeyboardButtonRequestManagedBot` button. A *user* taps it and creates the bot; the
manager gets a `managed_bot` update and can call `getManagedBotToken(user_id)`,
`replaceManagedBotToken(user_id)` (revoke + new token), and
`get/setManagedBotAccessSettings` (restrict to selected users). `getMe` shows
`can_manage_bots`. [V] [bots/features#managed-bots](https://core.telegram.org/bots/features#managed-bots),
[bots/api#getmanagedbottoken](https://core.telegram.org/bots/api#getmanagedbottoken),
[#keyboardbuttonrequestmanagedbot](https://core.telegram.org/bots/api#keyboardbuttonrequestmanagedbot)

> Implication: a person still taps once per bot, but the token could then flow to a
> manager bot's webhook instead of being copied by hand. Whether a managed bot's owner
> is the tapping user (not Xolace) matters for prod; not checked.

**Settable by the Bot API** (each returns `True`, most take an optional
`language_code`) [V] [bots/api#available-methods](https://core.telegram.org/bots/api#available-methods):

| Setting | Method | Limit |
|---|---|---|
| Commands menu | `setMyCommands` / `deleteMyCommands` / `getMyCommands` | ≤ 100 commands; command 1–32 chars `a-z0-9_`; description 1–256; scoped (7 `BotCommandScope`s) |
| Display name | `setMyName` / `getMyName` | 0–64 chars |
| Description (empty chat) | `setMyDescription` / `getMyDescription` | 0–512 chars |
| Short description (profile, share) | `setMyShortDescription` / `getMyShortDescription` | 0–120 chars |
| Profile photo | `setMyProfilePhoto` / `removeMyProfilePhoto` | `InputProfilePhoto` |
| Menu button | `setChatMenuButton` (per chat or default) | |
| Admin rights asked in groups | `setMyDefaultAdministratorRights` | |

**Not settable by the Bot API:** username, creating/deleting the bot, regenerating its
own token (only BotFather, or a manager bot for managed bots), privacy mode / inline
mode / group joining toggles (BotFather) [V by absence in bots/api; U that no other
route exists].

> Implication: a deploy-time or admin "configure bot" action can make every
> deployment's bot look the same (name, description, commands). Name per deployment
> (e.g. "Xolace (staging)") is possible by code; the username is fixed at creation.

## 2. `secret_token` and what the webhook should verify

From [`setWebhook`](https://core.telegram.org/bots/api#setwebhook) [V]:

- "A secret token to be sent in a header `X-Telegram-Bot-Api-Secret-Token` in every
  webhook request, 1-256 characters. Only characters `A-Z`, `a-z`, `0-9`, `_` and `-`
  are allowed. The header is useful to ensure that the request comes from a webhook set
  by you."
- Other params: `url` (HTTPS; empty string removes it), `certificate` (self-signed
  only), `ip_address` (pin the IP instead of DNS), `max_connections` 1–100 (default
  40), `allowed_updates` ("If not specified, the previous setting will be used"; doesn't
  affect updates created before the call), `drop_pending_updates`.
- While a webhook is set, `getUpdates` doesn't work.
- Non-2xx → Telegram retries "and give[s] up after a reasonable amount of attempts".

Transport requirements [V] [bots/webhooks](https://core.telegram.org/bots/webhooks):
ports **443, 80, 88, 8443** only; TLS 1.2+; IPv4 only ("IPv6 is currently not
supported for webhooks"); CN must match the domain; no redirects, wildcard certs "may
not be supported" ([bots/faq](https://core.telegram.org/bots/faq)). `*.convex.site` is
HTTPS on 443 [U: assumed from Convex serving HTTPS; not tested against Telegram].

**IP allow-list:** Telegram sends from `149.154.160.0/20` and `91.108.4.0/22`, and
"Our IP-range might change in the future." [V]
[bots/webhooks#an-open-port](https://core.telegram.org/bots/webhooks#an-open-port).
Convex HTTP actions receive a standard `Request`; Convex docs don't document a trusted
client-IP header [U]. So an IP check isn't a dependable control there.

**Older advice:** the FAQ still recommends "a secret path in the URL ... e.g.
`www.example.com/your_token`" [V] [bots/faq](https://core.telegram.org/bots/faq). The
`secret_token` header supersedes it (doesn't leak via URL logs).

What a webhook can verify, then:

1. Header equals the expected secret (constant-time compare). The only authenticator.
2. Method `POST`, JSON body, `update_id` present.
3. Optionally that the update is for this bot: updates don't carry the bot id, so a
   token mix-up between deployments is only detectable via the secret (one secret per
   bot/deployment) [V by reading `Update`].

`secret_token` is **not readable back**: `getWebhookInfo` returns no secret. To rotate,
call `setWebhook` again with a new one [V by the field list below].

**`getWebhookInfo`** → [`WebhookInfo`](https://core.telegram.org/bots/api#webhookinfo) [V]:
`url` (empty if none), `has_custom_certificate`, `pending_update_count`, `ip_address`,
`last_error_date`, `last_error_message`, `last_synchronization_error_date`,
`max_connections`, `allowed_updates`.

> Implication for a health check: `url === CONVEX_SITE_URL + path` detects a webhook
> stolen by another deployment; a growing `pending_update_count` or a recent
> `last_error_date` detects a failing endpoint. BotFather also sends "status alerts"
> when a bot replies slowly or not at all
> ([bots/features#status-alerts](https://core.telegram.org/bots/features#status-alerts)) [V].

## 3. One webhook per bot; moving it between deployments

- `WebhookInfo.url` is a single string and `setWebhook` takes one `url`, so a bot has
  exactly one webhook [V]. Calling `setWebhook` from a second deployment **replaces**
  the first; nothing notifies the first deployment [V for single URL; U that no
  notification exists, none documented].
- Pending updates are not lost on a move unless `drop_pending_updates: true`: they are
  delivered to the new URL [U: inferred from pending updates being tied to the bot,
  not the URL].
- `allowed_updates` persists across calls if omitted [V]. The new `secret_token`
  replaces the old one; the old deployment's secret stops matching [U, follows from
  one header per webhook].
- `deleteWebhook(drop_pending_updates?)` removes it [V]
  ([#deletewebhook](https://core.telegram.org/bots/api#deletewebhook)).
- **Repeated calls:** no rate limit on `setWebhook` is documented [V by absence].
  Community reports a `429 Too Many Requests: retry after 1` when it's called again
  within about a second [U]. General guidance: ~1 msg/s per chat, ~30/s overall
  ([bots/faq](https://core.telegram.org/bots/faq)) [V]; flood limits "may at times be
  stricter" in the test environment [V].

> Implication: if two deployments share a token (a preview copied from defaults, or two
> worktrees using the same dev bot), the last one to call `setWebhook` wins and the
> other goes deaf with no error. Running `setWebhook` automatically on every deploy
> would make every `pr-<n>` push steal the bot.

## 4. Convex: the URL each deployment exposes, and env vars

**Site URL.** "HTTP actions are exposed at `https://<your deployment name>.convex.site`"
[V] [functions/http-actions](https://docs.convex.dev/functions/http-actions). It is
available inside functions as `process.env.CONVEX_SITE_URL` (and `CONVEX_CLOUD_URL` for
the client URL), "always available" [V]
[production/environment-variables#system-environment-variables](https://docs.convex.dev/production/environment-variables#system-environment-variables).
Not `.convex.cloud`: the HTTP-actions debugging section says so explicitly [V].

Per deployment in this repo [R]:

| Deployment | Project | Name / URL | Source |
|---|---|---|---|
| prod | `xolace-app` | `energetic-guineapig-283` → `https://energetic-guineapig-283.convex.site` | `.github/workflows/staging.yml`, `pr-preview.yml` (`PROD_DEPLOYMENT`) |
| staging | `xolace-staging` (its Production deployment) | from the `prod:<name>` deploy key; not in the repo | `.github/workflows/staging.yml` |
| `pr-<n>` previews | `xolace-staging` | a generated `<adj>-<animal>-<n>` per preview, reused across pushes by `--preview-name pr-<n>`, deleted on unlabel/close | `.github/workflows/pr-preview.yml` |
| per-worktree dev | the dev project | a new name per `convex dev --configure` (main worktree's is `groovy-mandrill-892`) | `packages/backend/AGENTS.md`, `docs/setup/staging.md` |

- The workflow's URL check allows an optional region segment,
  `<name>.<region>.convex.cloud` [R `pr-preview.yml`], so the site URL may be
  `<name>.<region>.convex.site`. Read `CONVEX_SITE_URL` rather than building it [U for
  the regional site form].
- A **local** deployment (`convex dev --local`) serves on localhost, which Telegram
  can't reach; it would need a tunnel [U, not checked in docs].
- Custom domains for HTTP actions exist (Pro plan, set in Deployment Settings "on any of
  your deployments"); setting one changes `CONVEX_SITE_URL` [V]
  [production/custom-domains](https://docs.convex.dev/production/custom-domains). Not
  used in this repo [R].

**Preview lifecycle.** `convex deploy --preview-name X` reuses or creates preview `X`;
previews are deleted automatically after 5 days (Free/Starter) or 14 days
(Pro and up); every deployment counts toward the team's deployment limit; previews are
"a beta feature" [V]
[production/hosting/preview-deployments](https://docs.convex.dev/production/hosting/preview-deployments).
`--preview-run <fn>` runs a function when the preview is created [V]
([cli#deploy-convex-functions-to-a-preview-deployment](https://docs.convex.dev/cli#deploy-convex-functions-to-a-preview-deployment)).
Our workflow instead runs seeds with `convex run --deployment <name>` after every push
[R].

**Env vars per deployment.** Values are per deployment ("dev and prod can use different
values") [V]. CLI: `convex env set|get|list|remove`, with `--prod` or
`--deployment <name | dev/james | staging | project-slug:reference>` [V `convex env set
--help`, CLI 1.49.0]. Limits: 512 vars, 512 KiB total, name ≤ 256 chars, value ≤ 8 KiB
[V].

**Defaults.** Project Settings hold a default set **per deployment type** (dev,
preview, prod), also via `convex env default set|get|remove|list [--type]` [V
`convex env default --help`;
[#project-environment-variable-defaults](https://docs.convex.dev/production/environment-variables#project-environment-variable-defaults)].
They apply "only when a new deployment is created", "not kept in sync" [V]. This repo
already relies on Preview-type defaults in `xolace-staging` for the 28 staging vars
[R `docs/setup/pr-previews.md` Step 3].

> Implications:
> - A preview **can** have distinct env vars, but only if something sets them after
>   creation (the preview deploy key can run `convex run`; whether it can run
>   `convex env set` on its own previews was not checked [U]). By default, every
>   `pr-<n>` gets an identical copy of whatever `TELEGRAM_*` default exists.
> - A fresh worktree's dev deployment gets the **dev** defaults of the dev project, so
>   a shared dev bot token would land in every worktree.
> - With no token set, a deployment simply has no Telegram channel; the code has to
>   treat a missing token as "channel unavailable".
> - `CONVEX_SITE_URL` gives each deployment its own webhook URL with no config.

## 5. Telegram's test environment

[V] [bots/features#dedicated-test-environment](https://core.telegram.org/bots/features#dedicated-test-environment),
[#creating-a-bot-in-the-test-environment](https://core.telegram.org/bots/features#creating-a-bot-in-the-test-environment):

- "Completely separate from the main environment, so you will need to create a new
  user account and a new bot with @BotFather."
- Getting in: iOS, tap Settings 10× → Accounts → Login to another account → Test;
  Telegram Desktop, Settings → Shift+Alt+right-click "Add Account" → Test Server;
  macOS, tap Settings 10× for the debug menu → ⌘-click "Add Account". Log in with a
  phone number.
- API: `https://api.telegram.org/bot<token>/test/METHOD_NAME`.
- Relaxed: HTTP (no TLS) links allowed in `LoginUrl` and `WebAppInfo`. Not relaxed:
  "Flood limits are not raised in the test environment, and may at times be stricter."
- Webhooks in the test environment: not described; the HTTP-without-TLS relaxation is
  only for login/Web App links, not `setWebhook` [V by wording; U whether webhooks
  behave otherwise the same].

The same page also suggests the simpler route: "test your bot without interfering with
its users by simply running another instance of your code on a different bot account"
(a second production bot) [V
[#testing-your-bot](https://core.telegram.org/bots/features#testing-your-bot)].
`file_id`s are per bot, so media must be re-uploaded per bot [V].

> Implication: a test-environment bot needs our Telegram client to switch the API base
> path (`/test/`), and every tester needs a second Telegram account logged into the
> test server. A second production-environment bot needs neither; the cost is one
> BotFather `/newbot` per bot and a public-but-obscure username.

## Sources

- Telegram Bot API, [core.telegram.org/bots/api](https://core.telegram.org/bots/api) (10.4, 2026-11-09): `setWebhook`, `deleteWebhook`, `getWebhookInfo`/`WebhookInfo`, `setMy*`, `BotCommand`, managed-bot methods, `Update`.
- [core.telegram.org/bots/features](https://core.telegram.org/bots/features): BotFather, edit bots, managed bots, testing, test environment, status alerts.
- [core.telegram.org/bots/webhooks](https://core.telegram.org/bots/webhooks): ports, TLS, IPv4, IP ranges.
- [core.telegram.org/bots/faq](https://core.telegram.org/bots/faq): secret path, webhook problems, broadcast limits.
- Convex: [HTTP actions](https://docs.convex.dev/functions/http-actions), [Environment variables](https://docs.convex.dev/production/environment-variables), [Preview deployments](https://docs.convex.dev/production/hosting/preview-deployments), [CLI](https://docs.convex.dev/cli), [Custom domains](https://docs.convex.dev/production/custom-domains); `convex env set --help` and `convex env default --help` (CLI 1.49.0).
- Repo: `.github/workflows/pr-preview.yml`, `.github/workflows/staging.yml`, `packages/backend/AGENTS.md` (Deploy topology), `docs/setup/pr-previews.md`, `docs/setup/staging.md`; `docs/research/proactive-outreach-channel.md` (on `feat/outreach-channels`) for the `convex-telegram` reference (stores a SHA-256 of the secret, checks the header).
