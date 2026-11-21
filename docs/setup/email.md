# Email setup

How a Convex deployment sends email (#912, #914). Email is the outreach layer's third
channel, beside push and Telegram. It goes out through the `@convex-dev/resend`
component, from `Xolace <hello@mail.xolaceinc.com>`. For now it carries only the
**welcome**.

No email address is stored on a Xolace record. The adapter asks Clerk for the user's
primary verified address each time it sends (ADR 0004,
`docs/adr/0004-email-addresses-stay-in-clerk.md`). The component keeps its own copy of
each email until the daily cleanup deletes it.

The channel ships **switched off**. Nothing is emailed until an admin turns it on (see
[Turn email on](#turn-email-on)).

## Which deployment does what

| Deployment | Test mode | Who gets email | What it needs |
|---|---|---|---|
| prod | off | everyone | the full set below |
| staging | off | only the staff addresses in `EMAIL_ALLOWLIST` | the full set below, plus the allowlist |
| your dev deployment | on | nobody: every email goes to `delivered@resend.dev` | `RESEND_API_KEY` if you want to try it |
| PR previews, e2e | on | nobody | nothing; with no key, email is `not_configured` |

Test mode is on unless `EMAIL_TEST_MODE` is exactly `false`, so a deployment that sets
nothing can't email a person. In test mode the adapter sends every email to Resend's
test address `delivered@resend.dev` instead of the real one, and the component itself
refuses any other address.

On staging, an address that isn't on the allowlist fails the delivery for good
(`permanent`, code `not_allowlisted`), and Resend is never called.

With no `RESEND_API_KEY`, email is `not_configured`: the router never picks it, and a
welcome is recorded as suppressed with `no_channel`. Nothing else breaks.

## Environment variables

Set per deployment in the Convex dashboard (staging, prod) or with `bunx convex env set`
(your dev deployment). An agent never sets env on staging or prod. Names are listed in
`packages/backend/.env.example`. Never commit a value.

| Name | prod | staging | dev | What |
|---|---|---|---|---|
| `RESEND_API_KEY` | yes | yes | optional | A Resend API key with **sending access** to `mail.xolaceinc.com` only. One key per deployment. |
| `RESEND_WEBHOOK_SECRET` | yes | yes | no | The signing secret of that deployment's Resend webhook. Used once bounce and complaint handling lands (#916). |
| `EMAIL_FROM` | yes | yes | optional | `Xolace <hello@mail.xolaceinc.com>`. Unset means that same address. |
| `EMAIL_REPLY_TO` | yes | yes | optional | The monitored support inbox replies go to. Unset means no reply-to. |
| `EMAIL_TEST_MODE` | `false` | `false` | unset | Anything but `false` (or unset) keeps test mode on. |
| `EMAIL_ALLOWLIST` | unset | yes | unset | Comma-separated staff addresses, compared case-insensitively. Unset means anyone. |
| `CLERK_SECRET_KEY` | yes | yes | yes | Already set for account deletion; the adapter reads addresses with it. |

## One-time setup (product owner)

### 1. Resend account

1. Create the Xolace Resend account with a Xolace-owned login.
2. Add the domain `mail.xolaceinc.com` (**Domains** → **Add domain**). A subdomain keeps
   email reputation apart from `xolaceinc.com`'s own mail.
3. In the domain's settings, turn **open tracking** and **click tracking** off. Resend
   sets tracking per domain, not per email, so this is what keeps every Xolace email
   untracked. Check it again after any domain change.
4. Create one API key per deployment (prod, staging), each with **Sending access**
   limited to `mail.xolaceinc.com`.

### 2. Verify `mail.xolaceinc.com`

Add the DNS records Resend shows for the domain at the DNS host for `xolaceinc.com`:

- **SPF**: the `TXT` record and the `MX` record on Resend's `send` subdomain.
- **DKIM**: the `TXT` record at `resend._domainkey.mail.xolaceinc.com`.
- **DMARC**: a `TXT` record at `_dmarc.mail.xolaceinc.com`, starting with
  `v=DMARC1; p=none; rua=mailto:<a monitored inbox>`. Once a few weeks of reports
  look clean, move to `p=quarantine`.

Wait until Resend shows the domain as **Verified** before you turn email on anywhere.

### 3. Apple's Private Email Relay

People who sign in with Apple and choose **Hide My Email** have a
`@privaterelay.appleid.com` address. Apple forwards mail to it only from registered
senders.

1. In the Apple Developer account: **Certificates, Identifiers & Profiles** →
   **Services** → **Sign in with Apple for Email Communication** → **Configure**.
2. Register the domain `mail.xolaceinc.com` and the address `hello@mail.xolaceinc.com`.
3. Apple checks SPF for the domain, so step 2 must be done first.

### 4. The support inbox

Choose the inbox replies go to and make sure a person reads it. The welcome says that a
person reads replies, though not instantly. Set its address as `EMAIL_REPLY_TO` on prod
and staging.

### 5. The webhook (with #916)

In Resend, **Webhooks** → **Add endpoint**, one per deployment, pointing at that
deployment's site URL with the path the bounce handling adds. Copy each signing secret
into that deployment's `RESEND_WEBHOOK_SECRET`.

## Turn email on

The kill switch is the existing per-channel config. As an admin, run
`admin/outreachChannels:setChannelConfig` with
`{ "channel": "email", "enabled": true, "plan": "free" }`, and check it with
`admin/outreachChannels:listChannelConfigs`. Setting `enabled: false` stops every new
email at once; a delivery already queued still goes.

`admin/outreachView:viewUserOutreach` shows a person's email channel and their welcome
outcomes (queued, sent, failed, suppressed and why), never their address.

## Try it on your dev deployment

1. Make a free Resend account of your own, or use a Xolace dev key. With a personal
   account, `mail.xolaceinc.com` isn't verified there, so also set
   `EMAIL_FROM` to `Xolace <onboarding@resend.dev>`.
2. From `packages/backend`:

   ```sh
   bunx convex env set RESEND_API_KEY '<key>'
   ```

   Leave `EMAIL_TEST_MODE` unset.
3. Turn email on for your deployment (above), from the dashboard's function runner with
   an admin identity, or by adding an `outreach_channels` row in the dashboard's data
   view: `{ channel: "email", enabled: true, plan: "free", updatedAt: <now> }`.
4. Enqueue a welcome for your own profile:

   ```sh
   bunx convex run outreach/enqueue:enqueue '{
     "content": { "title": "Welcome to Xolace", "body": "Welcome to Xolace." },
     "dedupeKey": "welcome:<your emotional profile id>",
     "emotionalProfileId": "<your emotional profile id>",
     "intent": "welcome",
     "provenance": { "triggerReason": "manual_test" }
   }'
   ```

5. In Resend's **Emails** list, the welcome appears addressed to
   `delivered@resend.dev`. In the Convex dashboard, the `outreach` row and its
   `outreach_deliveries` row (status `sent`, `providerMessageId` set) hold no address.
