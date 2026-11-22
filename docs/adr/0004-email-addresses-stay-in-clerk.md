---
status: accepted
---

# Email addresses stay in Clerk; Convex looks them up at send time

Email is an outreach channel like push and Telegram. Unlike those channels, it gets no identity row holding the address. `users` deliberately stores no email (`convex/schema.ts`), and the email channel keeps that rule. Convex records that email is linked, which intents the user opted in to, and whether the address bounced or complained. The email adapter fetches the address from Clerk (`CLERK_SECRET_KEY`) for each send.

The one copy Convex does hold is inside `@convex-dev/resend`. That component keeps every email it sends (recipient, subject, body) in its own `emails` table until we delete it. A **daily** cron calls `cleanupOldEmails` with a 7-day cutoff and `cleanupAbandonedEmails` with a 28-day cutoff. A finished email therefore stays in Convex for at most about 8 days. We don't run the cleanup hourly: volume is weekly and low, so running it more often would only add function calls. Our own `outreach_deliveries` rows keep the delivery status and Resend's email ID, never the address.

## Considered options

- **Store the address in Convex** (on a channel identity row, written when email is linked). Sending is simpler and needs no Clerk call. But it reverses a deliberate privacy rule, and the copy goes stale when the user changes their address in Clerk.
- **Sync users into a Resend Audience and send the gist as a Resend Broadcast.** Resend would handle unsubscribes. But consent, escalation holds and timezones would then be split between Convex and Resend, and every address would sit at a third party indefinitely.

## Consequences

- Every send costs one Clerk API call. A gist going to every subscriber has to pace those calls to stay under Clerk's rate limit, for example through the channel's workpool parallelism.
- A deleted user can't be emailed after deletion, because Clerk no longer has the address. Any future **account notice** about deletion has to be sent, or its address captured, before the Clerk user is removed.
- An email can't be sent to an address the user typed into Xolace that isn't their Clerk address. A separate "send my emails elsewhere" address would reopen this decision.
