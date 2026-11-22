# Email setup

How a Convex deployment sends email (#912, #914, #915, #916, #917). Email is the outreach layer's third
channel, beside push and Telegram. It goes out through the `@convex-dev/resend`
component, from `Xolace <hello@notifications.xolaceinc.com>`. For now it carries only the
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

## The welcome

Every new user gets one welcome, about 30 minutes after signing up, so it lands after
onboarding rather than in the middle of it (#915). `users.getOrCreate` schedules
`outreach/welcome:sendWelcome` only when it creates a user, so signing in again, on
another device, or after reactivating a deleted account never schedules another.
Nobody who signed up before the welcome existed gets one.

`sendWelcome` goes through `enqueue`, which decides at send time:

- **Deleted account** within the 30 minutes: nothing is sent; recorded as suppressed,
  `account_deleted`.
- **Email switched off** or not configured: recorded as suppressed, `no_channel`. The
  welcome's dedupe key (`welcome:<profile id>`) is then spent, so **people who sign up
  while email is off never get a welcome**, even after it's turned on.

The words live in `packages/backend/convex/outreach/email/welcomeCopy.ts`, shared by
the HTML template (`welcome.tsx`) and the plain-text part. Copy changes go through
review, and the subject and preview must say nothing about mental health.

The template uses the app's Default theme (light) and the wordmark's gradient, in the
reader's system font: a web font would tell its host when the email is opened. Its one
image, the logo, is served by the deployment itself at `<CONVEX_SITE_URL>/email/logo.png`
(`email/logo.ts`, the lockup from `apps/admin/public/brand/` at 300 × 112), so no email
loads anything from another host, and the route records nothing.

### Links in an email

Mail clients don't open the app's `xolace://` scheme, so each link points at the
deployment's site, `<CONVEX_SITE_URL>/email/open/<target>`, which redirects into the
app (same mechanism as Telegram's `/telegram/open/`). Each target carries
`from=email` so the app can count returns from email. The redirect records nothing.

| Target | Opens |
|---|---|
| `talk` | `xolace://talk?from=email` |
| `vent` | `xolace://voice-vent?from=email` |
| `explore` | `xolace://explore?from=email` |
| `support` | `xolace://crisis-resources?from=email` |

Any other path is a 404. The footer also links IASP's helpline directory directly.

## Bounces and spam complaints

Resend tells each deployment what happened to an email through a webhook at
`<CONVEX_SITE_URL>/webhooks/resend` (#916). The component checks the signature against
`RESEND_WEBHOOK_SECRET` (an event that fails it is rejected and nothing acts on it),
updates its own copy of the email, then hands the event to
`outreach/email/events:onEmailEvent`. That callback finds the delivery by the
component's email id (`outreach_deliveries.providerMessageId`) and copies Resend's own
id for the email onto it (`resendEmailId`), from the first event it sees, usually
`email.sent` seconds after sending. Two events close email:

| Event | Email channel state | Effect |
|---|---|---|
| `email.bounced` with bounce type `Permanent` (a hard bounce) | `unreachable` | No more email to that person |
| `email.complained` (marked as spam) | `complained` | No more email to that person |

The component learns which callback to call when an email is sent, so a deployment
acts on events only from its first email after this shipped. Email shipped switched
off, so nothing was sent before that.

### Late bounces and complaints

The component passes an event on only while it still holds its copy of the email, and
the daily cleanup deletes that copy after 7 or 28 days (see
[Retention and erasure](#retention-and-erasure)). A complaint can come weeks later, so
the webhook route also handles the two closing events itself, once the component has
verified them: `outreach/email/events:closeByResendId` finds the delivery by Resend's
id (`resendEmailId`) and sets the same state. It runs for every closing event, early or
late; setting a state twice changes nothing. Resend's id is an opaque id, not an
address, so it stays on the delivery after the cleanup (ADR 0004).

A late event still finds its person only if an earlier event copied Resend's id. The
webhook must therefore have been up for at least one event of that email (normally
`email.sent`) while the component still held it. An email sent while the webhook was
missing or down, with no event until after the cleanup, is the gap: its late complaint
is ignored. Deliveries from before this shipped have no `resendEmailId`, and the same
applies to them.

Everything else is ignored, including soft bounces (`Transient`, `Undetermined`), which
Resend retries itself. An event for an email no delivery sent (another sender's mail,
or an account since erased) is ignored without error. Opens and clicks are never
recorded: tracking is off on the domain, and the callback drops those events anyway.

The state lives in `email_channel_states`, one row per person at most, with no
address. No row means `linked`, which is everyone from sign-up. A complaint stays a
complaint even if a bounce follows. The router treats `unreachable` and `complained`
as closed, so an email intent for that person is recorded as suppressed with
`no_channel`.

Nothing in the app clears the state yet. If someone fixes their address or asks to be
emailed again, delete their `email_channel_states` row in the dashboard. Account
deletion and a data wipe remove it with the rest of the person's outreach.

## Retention and erasure

The component keeps every email it sends (recipient, subject, body) in its own tables
(#917, ADR 0004). A daily cron, `clean up sent emails`
(`outreach/email/retention:cleanup`), deletes finished emails (delivered, bounced,
failed, cancelled) 7 days after they finished, and any other email 28 days after it
was queued. An address therefore sits in Convex for at most about 8 days. The
exception: an email counts as finished only once Resend's webhook reports it, so one
that went out while the webhook was missing or down stays until the 28-day pass. It
runs daily, not hourly: volume is low, so more runs would only cost function calls.

Account deletion and a data wipe cancel any email the component still holds unsent for
that person (status `waiting` or `queued`), so Resend is never asked to send it. That
includes one handed over while deletion was draining its delivery. An email already
sent is left alone; its copy goes with the daily cleanup. The delivery keeps only
Resend's id for the email, so a late bounce or complaint still finds the person.

## Environment variables

Set per deployment in the Convex dashboard (staging, prod) or with `bunx convex env set`
(your dev deployment). An agent never sets env on staging or prod. Names are listed in
`packages/backend/.env.example`. Never commit a value.

| Name | prod | staging | dev | What |
|---|---|---|---|---|
| `RESEND_API_KEY` | yes | yes | optional | A Resend API key with **sending access** to `notifications.xolaceinc.com` only. One key per deployment. |
| `RESEND_WEBHOOK_SECRET` | yes | yes | optional | The signing secret (`whsec_…`) of that deployment's Resend webhook. Unset, the webhook route fails every request and no bounce or complaint is recorded. |
| `EMAIL_FROM` | yes | yes | optional | `Xolace <hello@notifications.xolaceinc.com>`. Unset means that same address. |
| `EMAIL_REPLY_TO` | yes | yes | optional | The monitored support inbox replies go to. Unset means no reply-to. |
| `EMAIL_TEST_MODE` | `false` | `false` | unset | Anything but `false` (or unset) keeps test mode on. |
| `EMAIL_ALLOWLIST` | unset | yes | unset | Comma-separated staff addresses, compared case-insensitively. Unset means anyone. |
| `CLERK_SECRET_KEY` | yes | yes | yes | Already set for account deletion; the adapter reads addresses with it. |

## One-time setup (product owner)

### 1. Resend account

1. Create the Xolace Resend account with a Xolace-owned login.
2. Add the domain `notifications.xolaceinc.com` (**Domains** → **Add domain**). A subdomain keeps
   email reputation apart from `xolaceinc.com`'s own mail.
3. In the domain's settings, turn **open tracking** and **click tracking** off. Resend
   sets tracking per domain, not per email, so this is what keeps every Xolace email
   untracked. Check it again after any domain change.
4. Create one API key per deployment (prod, staging), each with **Sending access**
   limited to `notifications.xolaceinc.com`.

### 2. Verify `notifications.xolaceinc.com`

Add the DNS records Resend shows for the domain at the DNS host for `xolaceinc.com`:

- **SPF**: the `TXT` record and the `MX` record on Resend's `send` subdomain.
- **DKIM**: the `TXT` record at `resend._domainkey.notifications.xolaceinc.com`.
- **DMARC**: a `TXT` record at `_dmarc.notifications.xolaceinc.com`, starting with
  `v=DMARC1; p=none; rua=mailto:<a monitored inbox>`. Once a few weeks of reports
  look clean, move to `p=quarantine`.

Wait until Resend shows the domain as **Verified** before you turn email on anywhere.

### 3. Apple's Private Email Relay

People who sign in with Apple and choose **Hide My Email** have a
`@privaterelay.appleid.com` address. Apple forwards mail to it only from registered
senders.

1. In the Apple Developer account: **Certificates, Identifiers & Profiles** →
   **Services** → **Sign in with Apple for Email Communication** → **Configure**.
2. Register the domain `notifications.xolaceinc.com` and the address `hello@notifications.xolaceinc.com`.
3. Apple checks SPF for the domain, so step 2 must be done first.

### 4. The support inbox

Choose the inbox replies go to and make sure a person reads it. The welcome says that a
person reads replies, though not instantly. Set its address as `EMAIL_REPLY_TO` on prod
and staging.

### 5. The webhook

One endpoint per deployment (prod, staging), so each deployment hears only about its
own email.

1. Find the deployment's site URL: the Convex dashboard → the deployment →
   **Settings** → **URL & Deploy Key** → **HTTP Actions URL**, e.g.
   `https://<deployment-name>.convex.site`.
2. In Resend, **Webhooks** → **Add endpoint**, with the URL
   `https://<deployment-name>.convex.site/webhooks/resend`.
3. Under events, pick `email.sent`, `email.delivered`, `email.delivery_delayed`,
   `email.bounced`, `email.complained` and `email.failed`. Leave `email.opened` and
   `email.clicked` unticked: tracking is off, and Xolace never wants those.
4. Copy the endpoint's signing secret (`whsec_…`) into that deployment's
   `RESEND_WEBHOOK_SECRET`.
5. Check it: Resend's endpoint page lists each attempt. After the next email on that
   deployment, attempts should answer `201`. A `500` usually means the secret is unset
   or wrong (the deployment's logs say which).

## Turn email on

The kill switch is the existing per-channel config. As an admin, run
`admin/outreachChannels:setChannelConfig` with
`{ "channel": "email", "enabled": true, "plan": "free" }`, and check it with
`admin/outreachChannels:listChannelConfigs`. Setting `enabled: false` stops every new
email at once; a delivery already queued still goes.

`admin/outreachView:viewUserOutreach` shows a person's email channel and their welcome
outcomes (queued, sent, failed, suppressed and why), never their address. A person whose
address hard-bounced or who complained has an `emailState` on their email entry
(`unreachable` or `complained`, and when). It shows even while the kill switch is off,
when `ineligibleReason` reads `disabled` instead.

`listChannelConfigs` also gives the email entry a `notReachable` count of people in each
state (`unreachable`, `complained`), each counted up to 1,000. A rising count is the
first sign of a deliverability problem.

## Try it on your dev deployment

1. Make a free Resend account of your own, or use a Xolace dev key. With a personal
   account, `notifications.xolaceinc.com` isn't verified there, so also set
   `EMAIL_FROM` to `Xolace <onboarding@resend.dev>`.
2. From `packages/backend`:

   ```sh
   bunx convex env set RESEND_API_KEY '<key>'
   ```

   Leave `EMAIL_TEST_MODE` unset.
3. Turn email on for your deployment (above), from the dashboard's function runner with
   an admin identity, or by adding an `outreach_channels` row in the dashboard's data
   view: `{ channel: "email", enabled: true, plan: "free", updatedAt: <now> }`.
4. Send the welcome for your own profile now, rather than waiting for a sign-up:

   ```sh
   bunx convex run outreach/welcome:sendWelcome \
     '{ "emotionalProfileId": "<your emotional profile id>" }'
   ```

   It's sent once per profile. If yours already has a welcome, delete that `outreach`
   row in the dashboard first.

5. In Resend's **Emails** list, the welcome appears addressed to
   `delivered@resend.dev`. In the Convex dashboard, the `outreach` row and its
   `outreach_deliveries` row (status `sent`, `providerMessageId` set) hold no address.
