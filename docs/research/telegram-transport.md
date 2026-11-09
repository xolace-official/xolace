# Telegram transport: install `convex-telegram` or copy it

Researched 2026-11-09 for #724 (map #723). Re-check the version numbers and activity before you rely on them.

## Recommendation

**Copy, don't install.** Vendor about 100 lines of `convex-telegram` into `packages/backend/convex/outreach/telegram/`. Add `@gramio/types` as a direct dependency of `@xolace/backend`; it is types only. Don't add the component to `convex.config.ts`.

Installing would not block anything. `registerRoutes` mounts its handler in **our** `http.ts`, and handlers get the app's `ctx`, so one `ctx.runMutation(internal.outreach...)` could do durable-before-ack. The issue is cost against benefit:

1. **What we'd use is small, and what we'd skip is the component's only state.** The useful parts are the typed Bot API proxy (about 35 lines), the secret-header check (a string compare when the secret comes from env) and `setWebhook`. The component's one table, `webhooks` (bot username, `secretHash`), only serves its "no env secret" mode. We would set `TELEGRAM_WEBHOOK_SECRET` per deployment, so that table would stay empty and the component would be a mount with no reason to exist.
2. **Its API proxy drops what delivery needs.** On `ok: false` it throws a plain `Error` whose message holds `error_code` and `description` (`src/client/index.ts`, `botApiProxy`), and it drops `parameters.retry_after`. Our workpool adapter must tell three cases apart: 429 (wait `retry_after` seconds), 403 (the user blocked the bot, so set the channel identity to `revoked` and stop retrying), and other 4xx (permanent failure). Parsing an error string to get that is fragile. In our own copy, the proxy can throw a typed `TelegramApiError { errorCode, description, retryAfter }`.
3. **Its dispatch shape is the opposite of ours.** `registerRoutes` runs `onUpdate` and then each per-event handler **inline** in the HTTP action, and returns 500 if any of them throws. We want one path: verify the secret, insert `inbound_events` (deduped on `update_id`), schedule the router, return 200. Linking, `callback_query` and safeguard then all run in the inbound router, not in per-event HTTP handlers.
4. **The upgrade path we'd give up is thin.** Bot API type updates come from `@gramio/types`, which we keep as our own dependency. Every commit since v0.1.2 (2026-09-30) is a Renovate dependency bump. It is pre-1.0, has one maintainer and 3 stars, and 0.1.1 had breaking renames.
5. **Small footguns we'd inherit:**
   - `setupWebhook` defaults `dropPendingUpdates: true`, so re-running it throws away replies that haven't been delivered yet.
   - It defaults `allowedUpdates: ["message"]`, so callback buttons would silently do nothing.
   - It reads the token and secret at module scope (constructor and `registerRoutes`). Convex's docs say to read env inside handlers.

## How each requirement lands

| Requirement | Installed component | Our copy |
|---|---|---|
| Durable before ack | Possible: an `onUpdate` that runs one mutation and no `handlers`. Throwing still gives 500, so Telegram retries | Direct: the route inserts `inbound_events`, schedules, returns 200 |
| `update_id` dedupe | Not provided. Ours either way (an index on `channel` + `providerEventId`) | Same |
| `/start <token>` linking | Not provided. Ours either way (in the inbound router) | Same |
| `callback_query` | Typed handler key, but inline. We must still call `answerCallbackQuery` ourselves | Router branch; call `answerCallbackQuery` early from the processing action |
| Pacing via workpool | Proxy loses `retry_after` / `error_code` | Typed error, so workpool retry and backoff can use them |
| Testability (`convex-test`) | Ships `convex-telegram/test` (`registerComponent` with `import.meta.glob` over `src/`), the same pattern as our presence and credits tests. Sends still need `fetch` stubbed | No component to register. Put a `fetch` seam in the proxy and test the route and router like other `httpAction`s |
| Bot per deployment | Works: client code runs in the app, so `process.env.TELEGRAM_BOT_TOKEN` is the deployment's value | Same, read lazily inside handlers |
| `@gramio/types` | Comes in transitively (`^10.3.1`) | Direct dependency, pinned through the catalog. MIT, no dependencies, types only |
| `convex.config.ts` | One more `app.use(telegram)`, plus a component table and codegen | No change |
| Upgrades | Renovate bumps only; types come from gramio anyway | Bump `@gramio/types`; the copied code is plain `fetch` |

## What exactly to reuse

From `/Users/nathan/Developer/XolaceInc/sample apps/convex-telegram-main` (Apache-2.0). Keep the license notice and the "modified from" note in the copied file, as section 4 of the license requires.

- `botApiProxy` (`src/client/index.ts`), with two changes:
  - Throw a typed error that carries `error_code`, `description` and `parameters.retry_after`.
  - Read the token lazily (it already does this through `getToken()`).
- `generateSecret` (`src/client/utils.ts`): 32 random bytes as hex, which fits Telegram's `secret_token` charset. Use it in a one-off script that mints `TELEGRAM_WEBHOOK_SECRET` for a deployment.
- The `setupWebhook` flow, as an `internalAction` (`outreach/telegram/setup.ts`):
  - Call `getMe`, then `setWebhook({ url: CONVEX_SITE_URL + path, secret_token, allowed_updates: ["message", "callback_query"], drop_pending_updates: false })`.
  - Run it like `stream:webhook` (`convex run …` per deployment, never from an agent against prod or staging).
- The header check: compare `X-Telegram-Bot-Api-Secret-Token` to the env secret, using a constant-time compare.
- Don't copy:
  - the `webhooks` table and the `secretHash` mode;
  - `registerRoutes` and its per-event dispatch;
  - `TelegramBot.deleteWebhook`'s table bookkeeping.

## Telegram facts this depends on (primary)

- `update_id`: "Update identifiers start from a certain positive number and increase sequentially." The docs say it lets you ignore repeated updates. After a week with no updates, the next ID is random. So dedupe on equality and don't rely on ordering ([Bot API, Update](https://core.telegram.org/bots/api#update)).
- Webhook retries: any non-2XX response makes Telegram "repeat the request and give up after a reasonable amount of attempts". `max_connections` is 1 to 100, default 40 ([setWebhook](https://core.telegram.org/bots/api#setwebhook)).
- `secret_token`: sent in `X-Telegram-Bot-Api-Secret-Token`. 1 to 256 characters from `A-Z a-z 0-9 _ -` ([setWebhook](https://core.telegram.org/bots/api#setwebhook)).
- Callback buttons: "Telegram clients will display a progress bar until you call answerCallbackQuery", so it is necessary even with no notification ([CallbackQuery](https://core.telegram.org/bots/api#callbackquery)). That rules out answering only after slow work.
- Flood control: `ResponseParameters.retry_after` is "the number of seconds left to wait before the request can be repeated" ([ResponseParameters](https://core.telegram.org/bots/api#responseparameters)).
- Deep link: `t.me/<bot>?start=<payload>`. The payload is up to **64** characters from `A-Z a-z 0-9 _ -`, and the bot receives `/start <payload>` ([features, deep linking](https://core.telegram.org/bots/features#deep-linking)). This confirms the cap that `proactive-outreach-channel.md` listed as unverified.

## Convex facts this depends on (primary)

- Component HTTP actions have no `ctx.auth` and no app env vars. The docs recommend defining the handler in the component's client code and mounting it in the app's `http.ts`, which is what `registerRoutes` does ([components/authoring](https://docs.convex.dev/components/authoring)).
- A component's own functions can't reference app functions. Callbacks go through function handles ([same page](https://docs.convex.dev/components/authoring)). This doesn't apply to `registerRoutes`, whose handler runs as app code.
- Testing components: `t.registerComponent(name, schema, modules)`. Packages export a helper at `<pkg>/test` ([same page](https://docs.convex.dev/components/authoring)).
- Component env: declared in `defineComponent({ env })` and bound with `app.use(c, { env })`. It is optional when all of its vars are optional (`convex/dist/esm-types/server/components/index.d.ts`, convex 1.47.0). Our `posthog` mount already does this.

## Package facts (checked 2026-11-09)

- `convex-telegram`:
  - npm latest is **0.1.2** (published 2026-09-30). 0.1.0 and 0.1.1 came out 2026-06-08 and 2026-06-09.
  - Unpacked size is about 108 KB; it ships `dist` and `src`.
  - Peer dependency `convex >=1.29.3`; we are on `^1.47.0`.
  - The dev setup uses `convex-test` 0.0.62; our catalog pins 0.0.56. That only matters if we install and use its test helper.
- GitHub `Re11oy/convex-telegram`: 3 stars, created 2026-06-06, last push 2026-10-31. The last 10 commits are all Renovate. Open items: #49 (bump convex to 1.47) and the Renovate dashboard.
- `@gramio/types` 10.3.1: MIT, no runtime dependencies, types only (`out/index.d.ts`), last modified 2026-08-24.

## Sources

- `convex-telegram-main/src/client/index.ts`, `utils.ts`, `types.ts`; `src/component/schema.ts`, `webhooks.ts`, `convex.config.ts`; `src/test.ts`; `example/convex/http.ts`, `telegram.ts`; `package.json`; `CHANGELOG.md`; README
- `packages/backend/convex/convex.config.ts`, `http.ts`, `streamWebhook.ts`, `achievements/push.test.ts`, `test/harness.helpers.ts`, `vitest.config.ts`; root `package.json` catalog
- `docs/research/proactive-outreach-channel.md`, "Component and sample-app evaluation" and "Recommended architecture on Convex"
- https://core.telegram.org/bots/api, https://core.telegram.org/bots/features
- https://docs.convex.dev/components/authoring
- `npm view convex-telegram`, `npm view @gramio/types`, `gh api repos/Re11oy/convex-telegram`
