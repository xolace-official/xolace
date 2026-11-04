# Draft issue: exact age (date of birth) and a birthday note

> Draft for review, not filed yet. When approved it becomes a GitHub issue on
> `xolace-official/xolace` with the label `needs-triage`.
>
> **Title:** Exact age: ask for a date of birth instead of an age bracket, keep an age-declaration record, and send a birthday note
>
> Everything below the line is the issue body.

---

Related: #704 (onboarding v2), #711 (age gate before Xolacer chat), #715 (deferred-answer save path).

## Problem Statement

Xolace asks for an age bracket (`under_18`, `18_24`, `25_34`, `35_44`, `45_plus`, `prefer_not_to_say`). That no longer covers what we need:

1. **App-store age rules.** Apple and Google now give apps age signals and expect apps to use them where state and national laws require it. Apple's Declared Age Range API is live worldwide on iOS 26+, and Apple points developers to it for the Utah and Louisiana laws taking effect in 2026. Texas SB2420 was suspended by a court in December 2025. Google's Play Age Signals API is rolling out to every market by the end of 2026. For any feature with an age rule, Xolace has to be able to show that the user stated their age before they got access. A bracket answered once at intake, with no record of what we asked or when, can't show that.
2. **A birthday note.** A small, warm touch on the user's birthday. A bracket can't tell us when that is.

Three things about the current code shape this spec:

- **No code reads `ageBracket` today.** `git grep` finds it written by `intake.complete` (v1), sent to PostHog as the `age_bracket` person property, and in tests, and nowhere else. Nothing gates Xolacer chat by age. When #704 and #711 say "under-18 routing unchanged", they describe routing that doesn't exist yet. The Terms say "You must be at least 13 years old to use Xolace", and nothing enforces that either.
- **The age answer is on the pseudonymous side.** `intake_responses` hangs off `emotional_profiles`. A data wipe and an account deletion both purge it, and `users.getFullContext` returns the whole row to the client.
- **The deferred `ageBracket` answer hasn't shipped.** `api.intake.deferred.record` (#715) exists only on `feat/intake-v2`, where the first answer wins and can never change. No shipped binary calls it, so swapping it for a date of birth is still additive.

## Solution

1. **Stop using the age bracket.** v2 never asks for it, and nothing reads it. It stays in the Convex contract only because shipped v1 apps still send it.
2. Ask for a **date of birth only when a feature needs it.** Today the only 18+ feature is Xolacer chat, so in practice that's the gate before the first Xolacer chat (#711). Every user is asked there once, v1 users included. A later 18+ feature uses the same gate.
3. Write every age statement to a new **append-only age-declaration record** on the identity side (keyed on `users`, not `emotional_profiles`). It holds what the user said, what the app store said, the wording version we showed, when, and on which platform and app version. This is the record that shows the user declared their age.
4. Work out **one effective age status** per user (`unknown`, `under_13`, `13_17` or `adult`) from the latest date of birth and any store signal (the more restrictive one wins). Every gate reads this status server-side through one helper.
5. Let users **correct** a date of birth through a limited, logged path. A correction that makes them younger, or that doesn't cross an age line, they make themselves. A correction that makes them older across 13 or 18 goes through support and an admin tool.
6. On the user's local birthday, show a quiet **birthday card** in the app. A push goes out only if they turned it on. No sparks, no achievement, no upsell.

## User Stories

1. As a new user, I want to give my date of birth once, at the moment a feature needs it, with the reason shown, so that I know why it's asked.
2. As a new user, I want the date picker to work like the iOS and Android date pickers I already know, so that it takes a few seconds.
3. As a user who doesn't want to share my birthday, I want to know what I miss without it (Xolacer chat), so that the choice is mine.
4. As a user who typed the wrong date, I want to fix a typo myself, so that a slip doesn't need a support ticket.
5. As a user whose age is wrong in a way that keeps me out of a feature, I want to ask support to fix it, so that I'm not stuck.
6. As any user, I want to be asked my date of birth only when I open a feature that needs it, so that using the rest of Xolace never depends on it.
7. As a user under 18, I want to be kept out of features that aren't safe for me, with something else offered instead of a dead end, so that I still get support.
8. As a user under 13, I want a kind, clear message that Xolace is for 13 and older, so that I'm not left confused.
9. As a user on iOS 26 or later, I want Xolace to use the age range I already share with Apple when I allow it, so that I'm not asked for something my phone already knows.
10. As a user, I want a short, warm note from Flux on my birthday, so that the app feels like it knows me.
11. As a user who finds birthdays hard, I want to turn the birthday note off, so that the day stays mine.
12. As a user, I want any birthday push to stay inside my quiet window, so that it doesn't wake me.
13. As a Xolace admin, I want to see a user's age-declaration history and record a correction with a reason, so that every age change can be explained later.
14. As Xolace, we want a record of what each user said about their age, what we asked, and when, so that we can show a store or regulator that age was declared before a gated feature unlocked.

## Implementation Decisions

**Storage: a new `age_declarations` table on the identity side** (recommended; see Open question 1)
- One row per statement, append-only, keyed on `userId` (`v.id("users")`). Rows are never edited. A correction is a new row pointing at the row it replaces.
- Fields:
  - `dateOfBirth`: optional `"YYYY-MM-DD"` string. A calendar date with no timezone.
  - `source`: `self`, `apple_declared_age_range`, `play_age_signals`, or `admin_correction`.
  - `storeSignal`: optional; the raw range bounds and declaration or verification type the store returned.
  - `promptVersion`: the wording version shown, like `consent_records.consentLanguageVersion`.
  - `surface`: which gate asked, e.g. `xolacer_chat`.
  - `platform`, `appVersion`, `declaredAt`.
  - `replaces`: optional id of the row this one replaces.
  - `reason`: optional; required on corrections.
- Index: `by_user_declared` on `["userId", "declaredAt"]`.
- Lifecycle:
  - Account deletion purges it (`finalizePurge`).
  - A data wipe does **not** purge it. It's an eligibility record, not emotional content, and a wipe mustn't let someone restate their age past a gate.
  - The data-wipe copy says so.
- Why not `intake_responses`:
  - Its rows are wiped, so the gate would forget what the user told us.
  - A full date of birth sitting next to emotional answers makes the pseudonymous side easier to re-identify, which goes against schema principle 1.
  - The whole row goes to the client and partly into prompts.

**Effective age status**
- A pure helper, `ageStatusOn(dateOfBirth, localDay)`, plus a server helper `requireAgeStatus(ctx, user, minimum)` that every gate calls.
- Inputs, in order:
  1. Store signals. If the store says the user is under a line, the user is under it, whatever they typed.
  2. The latest self or admin row.
- No row means `unknown`. The intake `ageBracket` is never an input.
- Age is counted on the user's local day, using `preferences.notifications.timezone`, falling back to UTC.

**Asking (mobile, replaces the bracket step in #711)**
- The Xolacer-chat gate asks for a date of birth with the reason: "It decides who you can be matched with."
- The copy doesn't name the cutoff ages before entry, so the screen doesn't teach which year to pick.
- "Prefer not to say" stays as an option. It leaves the status `unknown`, which counts as not adult for gated features.
- On iOS 26+ and supported Android, the store age signal is read first (see Open question 4). The date of birth is still asked for the birthday note and exact age.
- v1 users are asked once too, at the same gate. Their old bracket isn't shown or used.
- Nothing else asks for age. Users who never open Xolacer chat are never asked, apart from the optional "Add your birthday" in settings (see "Birthday note").

**Correction**
- Self-service, logged as a new `self` row with a reason chosen from a short list:
  - Any change that keeps the user in the same status band, or moves them to a younger band.
  - Allowed at most once every 30 days (see Open question 3).
- Any change that moves the user up across 13 or 18 needs an `admin_correction` row, made in `apps/admin` via `convex/admin/*` with a written reason.
- The app sends the user to support for those ("If your date of birth is wrong, contact us").
- A store signal can't be overridden by a correction.

**Under-18 and under-13 handling** (see Open question 5)
- `13_17` and `unknown`:
  - Can't request a Xolacer conversation or become a Xolacer.
  - The Xolacer entry offers Kindling, the Library and crisis resources instead.
- `under_13`:
  - Xolace shows a kind "Xolace is for people 13 and over" screen and offers account deletion. Handling follows the Terms and COPPA.
  - The account is held: no sessions, no data collection beyond the declaration itself.
- Enforced in `xolacerChat.requestConversation` (and the Xolacer-side publish and accept paths), not only in the UI.

**Birthday note**
- Only users who gave a date of birth get one. Settings has an optional "Add your birthday" that writes a `self` row with `surface: settings`, so people who never open Xolacer chat can still choose it.
- A query `birthday.today` returns `{ isBirthday, age? }` for the caller's local day. The client never works out the birthday itself.
- In-app: a dismissible card on the Mirror home on the day, written in Flux's voice.
  - On by default.
  - Off with a new `preferences.birthdayNote` (optional, absent = on).
- Push: opt-in only, with a new `notifications.birthday` (optional, absent = off).
  - Sent once, by a daily cron that walks declarations by birthday month and day.
  - Respects `enabled`, the quiet window and the timezone, like the other pushes.
- 29 February birthdays fall on 28 February in other years.
- Tone (see the achievements glossary in `AGENTS.md`):
  - It celebrates the person, never getting through. No "another year survived", no "you made it", no age-milestone copy.
  - No sparks, no achievement, no streak effect.
  - No Xolace+ pitch or paywall that day.
- If the user's latest session hit an `elevated` or `crisis` safeguard level in the past 7 days, the push is skipped and the card is softer (see Open question 6).

**Analytics**
- The date of birth never leaves the backend for PostHog.
- v2 stops setting the `age_bracket` person property. A coarse age band worked out from the date of birth can replace it if a dashboard needs one.
- New events:
  - `age_declared` with source and surface.
  - `age_correction_requested`.
  - `birthday_card_shown`, `birthday_card_dismissed`, `birthday_note_disabled`.

**Convex contract (store-gap rule, `packages/backend/AGENTS.md`)**
- `intake.complete` (v1) keeps requiring `ageBracket`. `intakeAnswerValidators.ageBracket` and the `intake_responses.ageBracket` column stay, because v1 binaries keep writing them. Nothing reads them.
  - Mark them `DEPRECATED(remove-after: app >= <first version without v1 intake>)` with a `DEPRECATIONS.md` line.
  - Drop the bracket question from the v1 questionnaire once v2 wins (#704).
- `intake.deferred.record`:
  - If this lands before #715 merges, the `ageBracket` variant is dropped from the deferred union and `deferred.missing` stops listing it. Neither has shipped, so this is safe.
  - If #715 merges first, the variant stays, accepted and ignored by the gate, and gets a `DEPRECATED` mark and a `DEPRECATIONS.md` line.
- New, additive:
  - The `age_declarations` table.
  - `age.declare`, `age.status`, `age.requestCorrection`, `birthday.today`.
  - `admin.age.history`, `admin.age.correct`.
  - The two optional preference fields.
- Shipped binaries have no date-of-birth screen. If the new gate in `requestConversation` refused them, they'd show a generic error the user can't act on.
  - The server enforces `unknown` only on clients at or above the version that ships the date-of-birth screen. Old clients pass as they do today until that version is the minimum supported one (see Open question 7).
  - `13_17` and `under_13` are refused on every client.
  - The refusal is a `ConvexError` with code `age_required` or `age_restricted`, so new clients can show the right screen.

## Testing Decisions

- Tests check behavior through the public seam, never internal calls.
- Seams, highest first:
  1. **Age status (pure).** Birthday boundaries on the local day (the day before, the day of, the day after), 29 February, timezone edges, store signal overriding a self-declared adult, `unknown` when there's no row, and the intake bracket ignored.
  2. **Declarations and corrections (convex-test).** Append-only (no patch path), younger and same-band self-corrections allowed, an older-across-a-line correction refused for the user and allowed for an admin with a reason, the 30-day limit, rows survive a data wipe and go with account deletion, auth enforced.
  3. **Xolacer gate (convex-test).** `13_17` and `unknown` refused with the right codes, adult allowed, a v1 user with an adult bracket but no declaration asked like everyone else, old-client `unknown` allowed until the minimum version, an existing open conversation behaves as Open question 7 decides.
  4. **Birthday (convex-test, pure).** `birthday.today` on the local day, push only when opted in, quiet window respected, the safeguard skip, at most one push per year.
  5. **Client.** The date-of-birth gate shows the reason and not the cutoffs, "Prefer not to say" leads to the alternatives screen, the correction flow sends older-across-a-line changes to support.
- What the simulator can't prove, to say in PRs: real Declared Age Range and Play Age Signals responses (sandbox only), push delivery, store-level parental approval flows.

## Out of Scope

- Document or ID-based age verification, or any third-party age-assurance vendor.
- Changing the minimum age in the Terms, or the App Store and Play age-rating questionnaires (a separate store-listing task; the answers must match whatever this ships).
- Web, desktop, CLI age screens. The gate is server-side, so they inherit it when they get Xolacer chat.
- Apple's PermissionKit Significant Change API and Play's parental approval for significant changes, unless Open question 4 decides they're needed now.
- Asking anyone for a date of birth up front, at intake or at launch.
- Removing the v1 `ageBracket` argument or column (deprecated here, removed under the store-gap rule later).

## Open Questions (for the user to decide)

1. **Where the date of birth lives.**
   - Recommended: a new `age_declarations` table on the identity side, which survives a data wipe and goes with account deletion.
   - Alternatives:
     - A field on `intake_responses`: simplest, but wiped with the intake, and next to emotional data.
     - A field on `users` with no history: no record of who said what, when.
   - Also decide whether superseded rows are kept for the life of the account (recommended) or trimmed after a set period.
2. ~~What happens to `ageBracket`.~~ **Decided:** v2 stops asking for it and nothing reads it. It stays in the contract only for v1 clients. Every user, v1 included, gives a date of birth the first time they open an 18+ feature, and today that's only Xolacer chat.
3. **Correction limits.**
   - Recommended: self-service for same-band or younger changes, at most once every 30 days; support and admin only for older-across-13-or-18 changes.
   - Alternatives: no self-service at all (every change through support), or a 24-hour typo window only.
4. **Store age signals.**
   - Recommended: from the first release, read Apple Declared Age Range (iOS 26+, with gates at 13 and 18) and Play Age Signals (where available) everywhere they work, not only in regulated states. Record the response, and let the more restrictive result win.
   - Needs a native module (Expo module or config plugin) and Apple's Declared Age Range entitlement.
   - Alternatives: self-declared date of birth only for now, adding store signals before the first regulated market goes live.
   - Needs a legal check of which jurisdictions Xolace is distributed in and their dates (Texas enforcement is in dispute; Utah and Louisiana in 2026; Apple also lists Australia, Brazil and Singapore).
5. **Under-18 and the Xolacer gate.** What "under-18 routing" should be:
   - Recommended: no Xolacer chat for under-18s; they can't become Xolacers; they're offered alternatives.
   - Alternative: matching with Xolacers flagged for younger users, which needs a safeguarding policy and training first.
   - Also decide how `unknown` is treated: recommended the same as under 18.
   - Also decide what an under-13 declaration does: recommended a hold plus an account-deletion offer.
6. **Birthday note.**
   - Card on by default and push opt-in (recommended), or both opt-in?
   - Show the age number ("Happy 30th") or not? Recommended: not; it leans toward milestones.
   - The safeguard skip: 7 days, a different window, or none?
   - Where push opt-in is offered: settings only, or a one-line ask right after the date-of-birth step?
7. **Existing users and shipped binaries.**
   - Users who already have open Xolacer conversations when the gate ships: let the open ones continue and ask for a date of birth before the next new request (recommended)? Or ask before they can open any chat, and close the conversation with a kind message if they turn out to be under 18?
   - Users on old binaries with no date of birth: let them through until the date-of-birth version is the minimum supported (recommended), or force an update sooner?
   - The server has no client-version signal today (only `productFeedback` stores an `appVersion`). The gate needs one, e.g. a new optional `clientVersion` arg on `requestConversation`, where absent means an old client.
   - Someone with prod read access should count the users with open Xolacer conversations (and how many of them said `under_18` in v1) before deciding. Agents don't run against prod.

## Further Notes

- **Surfaces:**
  - Convex contract: additive (new table, new functions, optional preference fields), with the one change to the unshipped deferred union.
  - mobile: the date-of-birth gate, correction, birthday card, settings toggles, store-signal native module.
  - admin: age history and correction view.
  - web, desktop, cli: none now; they inherit the server gate.
  - docs: privacy policy (date of birth collected, why, retention), the data-wipe copy, Terms if Open question 5 changes eligibility, and `apps/mobile` / `packages/backend` AGENTS docs.
- **Suggested slices:**
  1. Backend table, `age.declare`, `age.status` and the gate helper.
  2. The mobile date-of-birth gate in #711.
  3. Correction and the admin view.
  4. Store age signals.
  5. The birthday note.

  Slice 1 should land before #711's UI.
- **Sources** (checked 2026-11-04):
  - [Apple: Update on age requirements for apps distributed in Texas (23 Dec 2025)](https://developer.apple.com/news/?id=8jzbigf4)
  - [Apple Developer Forums: Declared Age Range](https://developer.apple.com/forums/tags/declared-age-range)
  - [Google Play Console Help: Play Age Signals](https://support.google.com/googleplay/android-developer/answer/16569691?hl=en)
  - [Android Developers: Use the Play Age Signals API](https://developer.android.com/google/play/age-signals/use-age-signals-api)
  - [FKKS: App Store Accountability Acts and the Apple and Google APIs](https://technologylaw.fkks.com/post/102lxsp/countdown-to-jan-1-2026-mobile-developers-must-adopt-apple-google-apis-to-com)

  Secondary reports disagree on the current state of Texas enforcement. Legal should confirm before slice 4 ships.
