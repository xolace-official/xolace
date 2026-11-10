---
status: accepted
---

# `notification_log` is push's compatibility record, not the outreach record

Once outreach can go to more than one channel, the record of everything Xolace sends a user outside the app is the `outreach` table. Each attempt to send one on a channel is a row in `outreach_deliveries`. `notification_log` keeps being written, but only by the push adapter, one row per push delivery, with an optional `outreachId`. It is deprecated once no supported app build reads it.

The reason is that shipped mobile builds depend on `notification_log`:

- Every push carries `data: { logId, type }`.
- A tap calls `markResultedInSession(logId)`.
- The app reads `notifications.list` and "What landed?" (`recordLandedPublic`).

Under the store-gap rule these have to keep working for weeks after the backend changes.

Decided in [Outreach layer contract](https://github.com/xolace-official/xolace/issues/727).

## Considered options

- **Replace `notification_log` outright.** This breaks shipped builds: a push tap would carry no `logId`, and the history list and "What landed?" would go empty.
- **Write both tables for every outreach on every channel, indefinitely.** This leaves two sources of truth. `notification_log` also has no notion of a channel, and rows for Telegram sends would show up as phantom pushes in the old app's history.
- **Keep `notification_log` as the record and add a channel field.** It is one row per send, so an outreach that falls back to a second channel would repeat its content and outcome on every row. It also stores suppressions as undelivered pushes.

## Consequences

- **Suppressions** (rate limit, escalation, quiet window) are recorded only on `outreach`. `notification_log` stops recording suppressions, so any analysis of them reads `outreach`.
- **Intent names are mapped back.** The push adapter translates the new intent names into the old `type` literals when it writes the log: `nudge` → `follow_up`, and an affirmation-style send → `affirmation`.
- **New readers use the new tables.** AI de-duplication of copy (`recentNotificationContent`), session attribution and new client history read `outreach` and `outreach_deliveries`, never `notification_log`.
