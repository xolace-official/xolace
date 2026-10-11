# Changelog

All notable changes to Xolace are documented here.

---

## [Unreleased]

## [1.13.0] - OTA Update (2026-10-08)

### Changed

- **Faster image loads** — Lantern entry covers now load from resized WebP variants with ThumbHash placeholders and a shared cover component with a stable cache key, so covers appear instantly as a soft blur and sharpen in instead of popping in.
- **Smoother Lantern browsing** — hub covers are served at 1280px WebP, cutting download size and scroll jank.
- **New Lantern entries** — more reads added to the library, including additional loneliness entries.

## [1.12.0] - (2026-09-30)

### Added

- **The Lantern** — a library of reads organised by topic, with a reader that remembers your position so you can pick up where you left off.
- **New streak experience** — redesigned streak display with milestone acknowledgement for consistent days.

### Changed

- **Follow-up UI redesigned** — the post-session follow-up is clearer and easier to answer.
- **Xolace names what you're feeling more precisely** — reflections now recognise finer feelings like overwhelm, loneliness, homesickness and self-doubt, and life areas like studies, friendships, sleep and settling in, so what you read and who you're suggested to talk to fits more closely.
- **A new "Studies & exams" focus for Xolacers** — listeners can now say they're here for study and exam worries.
- **Performance improvements** — faster loads and smoother transitions across the app.

### Fixed

- Assorted bug fixes and polish.

## [1.11.0] - (2026-09-19)

### Added

- **Vessa, the audio catalog** — a browsable library of support audio and music, organized by topic. A new Browse tab surfaces a hub (entry buttons, a New shelf, a rotating listening tip), topic grids with curated art, and a topic screen for a full family list. Tracks play through a dedicated player with background playback and lock-screen controls; free users hit a paywall gate on play, Xolace+ users get the full catalog.
- **Kindling** — after a session where you seem to need it, Xolace quietly puts together a small bundle of 3–4 next steps for you — a support-audio or music track, a breathing exercise, or a chat with a Xolacer — and lets you know it's ready. You'll see it on Today and can work through it in any order, at your own pace. Xolace+ only.
- **The Xolace channel** — a standing broadcast channel from the team, with push notifications, unread counts, and its own row in your chats list.

## [1.10.0] - OTA Update (2026-09-11)

### Changed

- **Haptic feedback refined across app flows** — nudged intensity and removed stray buzzes across reflect, vent, quotes, and Connect so feedback tracks the action instead of firing on everything.
- **Session rate-limit copy + upsell** — hitting the daily session cap now reads clearly and offers a Xolace+ upsell instead of a bare error.
- **Quote saving is a Xolace+ feature** — keeping a quote is gated to Xolace+; unsave gating and ask-flow re-entry fixed alongside it.
- **A seeker's first Xolacer request opens the primer** — the primer sheet shows once before the first request goes out.

### Fixed

- **Session rate-limit crash** — hitting the cap no longer crashes the flow.

## [1.10.0] - OTA Update (2026-09-09)

### Fixed

- **Notification taps route where they should** — tapping a push notification now deep-links to the right screen, and a stale tap (an old notification response left in the native launch cache) no longer replays on remount or an auth-state flip to yank you somewhere unexpected. Intake still wins on a cold launch. Web guards the unsupported `getLast`/`clear` calls so they can't crash.
- **The resting reflect card opens on tap again** — the tap target now sits above the readings it covers instead of below them, so a tap landing on the prompt line opens the composer rather than dying on the text. The discard control still sits on top.
- **The vent screen stays awake** — the display no longer dims or sleeps mid-vent; the lock is released the moment the screen unmounts.
- **The idle-menu scrim covers the whole window** — it now reaches back over the host screen's top-inset padding to dim the status-bar strip too.
- **Android intake text no longer overflows its card** — `AppText` sets `includeFontPadding: false` on Android, so copy measures the same height it does on iOS and stops overflowing the fixed-height offer boxes.

## [1.10.0] - (2026-09-05)

### Added

- **Post-signup intake** — a new, forward-only flow that runs once right after sign-up, before the app proper. It opens on the founder's letter, moves through a short questionnaire (11 questions, 2 interstitials, one branch that only opens for short-form-video answers), and ends on the Plus offer deck / plans step. It's a fourth root-level route group (`(intake)`), a sibling of `(onboarding)` / `(auth)` / `(protected)` and deliberately **not** nested under `(protected)` — an unfinished user never mounts Stream chat, presence, or push. Every step is a `push`/`replace` with gestures disabled: there is no back edge out of intake. Answers use the `intakeAnswerValidators` enums verbatim so they reach `intake.complete` untranslated, and the whole funnel is instrumented (`intake_completed` latched once, offer-deck impression matched to what was actually shown, person-property dual-write).
- **The founder's message, in intake** — one letter shown to everyone (Nathaniel's own words, `founder-message/letter-copy.ts`, edited only with him). A returning user (`sessionCount > 0`) sees the same message plus one highlighted callout acknowledging they've been here — never a separate screen. One CTA for everyone ("I'm ready").
- **Keep a quote** — a star on the daily quote saves it; kept quotes live in an archive you can scroll back through. Keeping is a field on the quote, not a local list.
- **Quotes have titles** — a generated quote now arrives with a short title, rendered on a softened plate.
- **Reply to the deck's question** — the quote deck can ask a question; your answer is kept safe, feeds *tomorrow's* quote (register only — it never reaches the mirror), and a kept reply can also surface on your profile as a reflection. The archive half of that surface reports back, and the reply gets a denominator.

### Changed

- **Reflect screen rebuilt (#246 build order)** — the idle screen and the composer are now one object at two sizes: a single progress value drives the card's position, size, rotation, corner radius and prompt size together, so tapping it opens the page already in front of you instead of cross-fading to a different screen. The bottom edge tracks the keyboard's real animated height. Behind it, a Skia sweep-gradient wash (centred, 55px blur, nine token-derived stops) replaces the flat background and gives every palette a distinct hue. The identity chrome — streak, space name, event pill, "A word for today" — is collected into one thin **Perch strip** that no longer defers to whichever prompt won; the old encouragement line is gone. Flux (the mascot) is resized and converted from a 431KB PNG to a 7.6KB WebP on this most-opened screen.
- **Your draft survives closing the composer** — dismissing the card no longer wipes what you typed. The resting card shows the draft's opening line in place of the prompt (italic, dimmer, so it never reads as the space's question), with a Discard control where the composer's close button was. "Start fresh" still clears it.
- **Reflect tour re-cut to four steps** — the card, the mic, the chips, the menu. The persisted `reflectTourSeen` boolean becomes a numeric `reflectTourVersion` gate, so a future re-cut can be shown again by bumping the number; existing devices read as version 0 and see the new tour once.
- **The daily quote renders as a poster** — today's quote is the poster hero; the deck is the poster's *second sheet*, carrying a fixed print palette rather than theme chrome, with theme shrunk to the gutter and gap. The quote archive is a scrollable stack — opening a card animates only that card's own height (one Reanimated CSS transition on `height`/`marginBottom`, `cubic-bezier(0.4, 0, 0.2, 1)` at 340ms), virtualised, with no "View all" cap. A shared quote image is rebuilt at export size so it's the poster, not a screenshot of it.
- **Xolace+ upsell redesign** — new mascot/postcard assets and a reusable `AnimatedDashedBorder`, applied to a darker postcard-style profile Plus row and proactive offer card (scrim, accent-highlighted `Xolace+`). Messaging moves from "nights" to "days"; the profile upsell row moves earlier in the screen, entitlement gating unchanged.
- **Quote moderation and reaction UX hardened.**

### Fixed

- **Clerk ⇄ Convex auth desync hang** — a valid session could hang forever once Convex had latched `noAuth`. The guard now forces a Convex re-auth via a `sessionId` epoch bump instead of leaving the session alone, and signs out after a bounded number of attempts.
- **Streak card no longer stranded** — it stays in the Perch strip at a count of 0, and a failed measure can't leave it invisible.

### Backend

- **Five proactive Xolace+ offer moments, wired end to end (#227)** — session end (competing in the one close slot, precedence `suggestion > plus > bridge`), mid-flow (its own call site right after "That's it", stood down inside a user's first session and on any mirror that only reached), and profile (beside the insight it talks about, with a real recurrence observation over the week's tags — arithmetic over a closed set, no model call per the Constitution rule). One `offerContext` query feeds all three sites; one recorded session id enforces "max one offer per session" across them; the card spends the budget when it *mounts*, so a plus decision that loses the close slot costs the user nothing. Policy (`choosePlusOffer`) is pure: safeguard veto first and unconditional, 7-day per-moment cooldown, three lifetime dismissals stop everything for 30 days, never two sessions running. Cooldown/dismissal state is device-local on the persisted `toggles` slice.
- **`"use node"` directives dropped from `convex/ai/` and `convex/jobs/` (#248)** — those files use nothing from the Node runtime (the Anthropic SDK is fetch-based; the rest is fetch + Web Crypto). Running them in the default Convex runtime lowers cold-start cost and makes them reachable from `convex-test`. `streamGunzip.ts` keeps its directive — it needs `node:zlib`.
- **Test suite migrated to Vitest + CI (#247, #249–#252)** — one `vitest.config.ts` (`node` default, `edge-runtime` opt-in per file for `convex-test`), a 44-file mechanical `bun:test` → `vitest` swap, and a `test` job added to CI. Leaf DB mutation, auth-guard, and mirror-pipeline coverage added; global v8 coverage thresholds set just under the observed `convex/**` baseline so the suite fails when coverage drops.

## [1.9.1] - OTA Update (2026-08-25)

### Added

- **A weekly cohort card on Discovery** — once a week, an animated card counts up the number of other campers who sat with the same emotion as your last session, closing on "You are not alone." Computed by a new Monday cron into a materialized summary doc (not a live query — Convex has no `COUNT DISTINCT`, and the card counts distinct campers, not sessions) so every Discovery load reads a precomputed number instead of scanning an unbounded table. No safeguard filter is applied to the count — it gates an integer, not content, so a crisis session is not excluded from being one of the "22."
- **The `reaching` mirror ends on a question instead of stopping** — previously, when a mirror named a gap it couldn't close, it just stopped there, reading like it had given up. The `reaching` prompt now asks for the shortfall to be closed in one continuous utterance ending on a question. What that question may reach into is set by prompt structure, not new code: `buildMemoryContext` renders the semantic-profile section only when a profile exists, and the prompt directs the question to name one specific thing from that section when it is present, and to propose nothing when it is absent. This is a scoped reversal of the standing "declarative, never interrogative" constraint (#171), for this block only. No new field, claim strength, or gate signal — `routeClaimStrength`, `decideMirrorOutcome`, and `holding` are untouched.
- **Long-press a conversation for quick actions** — Close, Archive, and Delete now live in one bottom action sheet on any Connect row, matched on iOS and Android (Android renders its own Material icons instead of the text labels the toolbar drops there).
- **Archive a conversation** — hide a row from your main list without touching the other side's copy or the conversation itself; find it again under the new Archived view. Archiving is read-time, not a stored decision: any new activity on the row un-archives it the moment it happens, so nothing can go stale behind an archive you forgot about.
- **A xolacer can close a conversation on their own terms** — rather than waiting on the 14-day quiet sweep, a xolacer can wrap one up manually from the action sheet. It's the same resting state either way, but the row's chip, subtitle, and the thread's own status bar now say which kind it was — a courtesy sign-off reads differently from a conversation that just went quiet.
- **Delete a declined or expired request from your own list** — offered only on the two request outcomes that never became a conversation, since a declined or expired row has no channel, message, or rating hanging off it. Deleting is per-side: it clears your copy without touching theirs, and once both sides have deleted, the row is purged outright. Sending a fresh request afterward reopens the same row instead of creating a new one.

### Fixed

- **Status bar style no longer leaks across tabs** — Discovery's header forced light/dark status bar text unconditionally, and since Expo's native tabs keep every tab mounted, that override kept winning even after switching away from Discovery. It's now scoped to whether the tab is actually focused.

## [1.9.1] - (2026-08-23)

### Added

- **A new onboarding** — the old two-screen intro/auth flow is retired. First-time signed-out users now land on a single promise screen; returning signed-out users go straight to a carousel deck (Mirror, Vent, this week's proof, Xolace+) that ends on the sign-in sheet. The root guard now routes purely on `introSeen`, and the sign-in buttons share one `use-provider-sign-in` hook so both providers get the same cancel-handling and loading state.
- **Change your username** — Settings now lets you edit the display name shown across the app (labeled "Username" in the UI), alongside stable conversation tags.
- **Edit a published Xolacer profile** — a xolacer can now go back and change their photo, name, bio, specialties, and listed/paused state from a single sheet, reached via a pencil icon on their own profile. Previously the setup wizard only ran once, with no way back in.

---

## [1.9.0] - OTA Update (2026-08-17)

### Fixed

- **Copy, Edit, and Delete work again on a chat message** — all three did nothing, and it was one broken action taking the other two down with it. Stream's clipboard bridge called an `expo-clipboard` function that Expo SDK 57 removed, so "Copy Message" was still offered and threw the moment it ran. Menu actions don't run when tapped: they're queued and flushed once the menu's close animation finishes, in a loop that empties the queue only after every action has run. The failing copy aborted that loop and stayed at the head of the queue, re-throwing ahead of everything queued behind it — so a single Copy tap disabled the whole message menu until the app was restarted. Fixed upstream in `stream-chat-expo` 9.7.3; we're on 9.7.6, with `stream-chat` moved to ^9.51.0 to match (otherwise a second copy of the client library gets installed alongside the first). No native change — verified by diffing the packages, the only native delta across the range is iOS video-thumbnail quality, which this text-only surface never touches.

---

## [1.9.0] - (2026-08-12)

Requires a native rebuild (per-event notification sounds live on their own Android channels, frozen once created on-device).

### Added

- **Xolacers know when someone wants to talk** — sending a request now pushes to the xolacer immediately, titled with the seeker's pseudonym and the exact wording the chats list already shows for that row, so the two surfaces can't drift apart. Tapping routes straight into the right Connect segment (Requests or Chats) rather than whatever the tab last had open.
- **Seekers hear back** — accepting a request notifies the seeker with the xolacer's real display name (not a pseudonym — that's what every other surface calls them) and lands them in the thread ready to write. Declining notifies as "Xolace" with no name attached at all, so the title can never regress into naming someone, and the body ends on an option instead of the rejection; tapping lands on the roster with any specialty filter cleared. Expiry, blocking, resume, and a xolacer leaving still send nothing.
- **A message in an open thread buzzes the other side** — driven by a signed Stream webhook rather than app-side polling. The title is the sender's pseudonym, the body only ever says "Sent you a message" — the content itself never leaves Stream and can't reach a lock screen. A burst inside a 2-minute window collapses to one notification per direction, so a chatty exchange can't spam either phone.
- **Chat notifications have their own mute switch** — Settings now separates "the AI reaching out" with a gentle nudge from "a person waiting on you" into two independent toggles over one shared OS permission and push token. Either can be muted without silencing the other; chat notifications are on by default once permission is granted, so nobody has to go find the switch first.
- **Each kind of arrival gets its own sound** — request and accepted share a warmer tone (someone is waiting on you), message and declined a lighter one, the AI's own check-ins a third. Each rides its own Android notification channel, so the two families can be told apart — and silenced independently — at the OS level too.
- **"Here now" presence** — a live dot now shows when a xolacer is in the app: on the roster, a xolacer's own profile, a pending request, an incoming request, and the chats list. It's backed by a single app-wide Convex Presence room with one heartbeat per client, mounted at the protected-route layout root so someone reflecting on another tab still reads as present. Only a derived "is this person here" boolean ever leaves the server — no room membership, no list of who's online, ever reaches a client. Presence is shown only where there's something to act on: a resting or closed conversation never discloses it, and a xolacer who's toggled themselves out of the directory can't be watched via a deep link. The roster's *ordering* is snapshotted on load (so a xolacer arriving mid-scroll can't reshuffle the list under your finger), but the dot itself always reads live.
- **Live thread status** — an open Xolacer conversation now shows typing, online, and "active Xm ago" in the header, replacing the old static "usually replies within a day" line.
- **The end-of-session offer favors someone actually here** — when a session close offers a xolacer, a present, specialty-matched person now outranks an absent one; presence is only ever a tie-break on top of the specialty match, so it can never surface someone who doesn't relate to what was shared.

### Fixed

- **You don't get pinged for a thread you're already looking at** — banner, sound, and tray entry are suppressed for a conversation while that specific thread is open, and more broadly while the app is foregrounded at all; opening a thread also clears anything already sitting in the tray for it. A different thread with someone else waiting on you is left alone.
- **A decline can't be immediately re-requested** — a declined request now rests for the life of that unanswered request before the same xolacer can be asked again, closing a loop that (since requests started pushing to a lock screen) had no real ceiling besides blocking. An expiry from silence carries no cooldown — going quiet isn't a refusal.
- **A reply lands as reliably as the message that prompted it** — the 2-minute send window used to be shared by both directions of a thread, so a seeker's message could swallow the xolacer's reply forty-five seconds later. Each direction now keeps its own stamp.

---

## [1.8.0] - OTA Update (2026-08-12)

### Fixed

- **Notifications stop being sent to devices that no longer exist** — an uninstall raises no event, so nothing ever removed a device from the registry, and the per-device fix shipped a day earlier made that worse: a reinstall created a new row while the old one survived, so rows accumulated instead of being overwritten. Two things reap them now, both inside the send that was already reading the list — no new scheduled job. A device the push service has rejected five consecutive times is removed on the spot; a device that has not checked in for 180 days is removed on the clock, which is what catches an installation abandoned by a token change and never sent to at all. A device that is merely dormant is never touched: not opening the app for a while is precisely who the return nudge is built to reach, and mid-retry, ambiguous, and delivered states all count as alive. A device removed in error costs nothing permanent — it re-registers the next time that person opens the app, and reaping never touches notification preferences, so the master switch keeps meaning what it says.
- **Notification text is no longer kept forever** — the push component stores each notification's title and body and never prunes them, so every nudge and conversation alert Xolace had ever sent was still sitting there. A device clears its own stored history each time it registers, which is the moment it proves it is alive and its delivery record stops meaning anything, and removing a device now takes that device's stored notification text with it — including on account deletion and when a reinstalled device changes hands. Clearing is skipped while any recent notification is still in flight, and retried on the next launch, so bookkeeping for other people's notifications in the same batch can't be disrupted.

---

## [1.8.0] - OTA Update (2026-08-11)

### Fixed

- **Notifications reach every device you use** — the push component stores one token per recipient key, and Xolace was using the emotional profile as that key, so the last device to open the app silently replaced every other one: a phone re-registering moved delivery off the tablet, and turning notifications off anywhere turned them off everywhere. An app-owned `push_devices` registry now gives each installation its own recipient key, and both dispatch paths — AI nudges and conversation events — fan out through one shared helper so a fix can never land on one and not the other. Turning notifications off in Settings still silences the whole account, because that is the preference doing it, not the token.
- **A reinstalled or handed-down device can't inherit someone else's notifications** — nothing enforced one owner per Expo push token, so a device that changed hands could keep receiving the previous account's notification content. Registering a token now evicts whoever held it before, and signing out detaches the installation on the way past. One logical nudge still consumes one rate-limit event and writes one log row, whatever the device count.

---

## [1.8.0] - OTA Update (2026-08-07)

### Added

- **Unread badges on conversation rows** — a row in Connect → Chats now carries a pill with the number of messages waiting in that thread, live from Stream. The rule lives in `unreadBadge()` with a test table: no badge on `requested` (nothing to read yet — a count there would read as "something to decide") or `closed` (finished, it should stop asking for attention), a badge on `resting` as well as `open` (a resting thread is live, and a new message in one is exactly the signal worth surfacing). The visible label caps at `99+`; the accessibility string never caps, since a screen reader has no layout constraint and "150 unread" is better information than "99+". The count is appended to the row's accessibility label so VoiceOver hears what the pill shows.
- **Typing indicator in threads** — "<name> is typing…" is back in a conversation, rendered by a custom `ConversationTypingIndicator` registered over Stream's stock one (which draws the raw Stream avatar and profile name with no override slot).

### Fixed

- **The typing indicator wears the right name** — it used to ask "is someone *other than me* typing?", the negation rule removed from message bubbles in #138. That attributes the user's own typing to the counterpart for the window where the local user id is unset during a reconnect, and dresses any third party — a system notice, a safety intervention — in the counterpart's name. It now asks `resolveMessageIdentity` whether the typing user *is* the counterpart and takes the name from the resolver's answer, so one function decides identity on every surface; an unrecognised typer gets no indicator at all.
- **The unread count keeps up with reality** — the subscription was a fresh closure each render, so React tore it down and re-registered it on every row re-render; it is wrapped now. It also watched four hand-picked channel events, missing three real paths: a read on another device (client-level only, no channel id), a truncated history, and a new message in an unwatched channel. One client-level subscription covers all of them.
- **Badges are there on first paint** — the warmup's `queryChannels` populates unread counts as a side effect of hydrating channel state, and Stream dispatches `channels.queried` *before* that hydration, so a row re-reading on it saw zero and stayed blank until an unrelated re-render happened along. The warmup re-announces the event once the counts are there, through the client's event bus rather than a React state bump — the compiler caches the list subtree on props a hydration flag would not be part of, so the re-render would never have reached the rows.

---

## [1.8.0] - OTA Update (2026-08-05)

### Added

- **Your Moments timeline teaser on Discovery** — the first 4 timeline moments now surface in a themed stacked carousel right after the quotes card, with a static voice badge for voice-entered sessions and a "See more" link to the full timeline. The now-redundant "Timeline" entry is removed from the reflect idle menu, since Discovery is the primary entry point.

### Changed

- **Appearance: theme picker is now a snap-to-center carousel** — the "App Themes" section in Settings → Appearance is a bounded, scroll-driven carousel instead of a flat scroll list: the centered card scales up while its neighbors recede, the section background subtly glows toward the centered theme's accent color, and a divider marks the boundary between free and Xolace+ themes. Scrolling only changes visual focus — applying a theme is still a deliberate tap, unchanged from before. The falloff and glow animation are disabled under Reduced Motion.

---

## [1.8.0] Released - (2026-08-01)

### Added

- **Xolacers — talk to a real person** — the fire is no longer the only thing in the dark. A new **Connect** tab holds two things: **Chats** (your conversations, in every state) and **Xolacers** (the roster of people who've offered to listen). A xolacer is a trained peer, never a therapist, and every surface says so. You browse real profiles — photo, name, a line about why they're here, what they listen to, and their rating — then send a request. Nothing is sent until they accept; you can hold at most **2 pending requests** and **8 open conversations** at a time. Chats are one-to-one and text-only, with a safety strip in every thread and a route to crisis resources always one tap away. Conversations can be closed and later resumed, and closing one opens a **rating** screen so the roster stays honest.
- **Become a xolacer** — anyone can offer to listen. A guided five-step setup (photo → name → a short bio → up to three specialties → review) builds the profile other people will see, with a live progress meter and a plain "this is what people see; your real name and contact details are never shown" review step. Once published, an **Active / Away** toggle lets a xolacer step back without deleting anything — away means no new requests, existing chats untouched.
- **A person offered at the end of a session** — when a session ends on something a xolacer has declared they listen to, the close phase offers one named person instead of the usual Bridge card. Never both, never an algorithmic "matched for you" claim — just the fact of what that person said they're here for, with their face and rating. Tapping opens their profile; nothing is sent until you choose to reach out.
- **Block and report a Xolacer** — every thread and every Xolacer profile now carries a native overflow menu holding **Block** and **Report a concern**. Blocking freezes the conversation at the server, so Stream itself refuses sends from *both* sides — not just a change to what your own app displays. It's confirmed first, the confirmation says plainly that it can't be undone, and it can't: the conversation is closed as `blocked` and a blocked pair can never re-request. The blocked party is never told a block happened; they see the ordinary closed-state copy and the conversation then disappears from both lists. Nothing is deleted — the row, the history and the frozen channel all remain for moderation. Either side can block, including a xolacer who has already accepted, which previously had no exit at all. Blocked conversations are never offered a rating. Reporting a concern now records **who it is about** (and, from a thread, which conversation), so a moderator can act on it; reports are a distinct kind of feedback with their own moderation filter, their own 2-per-day budget so a safety report is never refused because you spent the day sending feature ideas, and an alertable event so a report reaches a human. The Bug/Idea toggle is gone from the concern form — someone reporting a person who frightened them should not be asked to file it as a feature suggestion. The old "Report a concern" text link at the bottom of a profile is removed; it sat in a crowded footer with a recorded mis-tap hazard. Together these meet App Store Review Guideline 1.2 for user-generated content.
- **New home tab (Discovery)** — the app now opens on a poster masthead with a daily quote card and a **Reflect** dock that keeps starting a session one tap away from anywhere. Tabs replace the old single-screen entry.
- **Reflection rank** — the timeline gains a percentile card showing how a reflection landed relative to the rest of the pool.

### Changed

- **Renamed "listeners" to "xolacers"** across every surface — the people who listen are Xolacers, and the language is consistent from the roster to the thread header to notifications.
- **Chats open on messages, not a skeleton** — the Stream connection and every channel in your list are warmed as soon as the Connect tab loads, so tapping a row lands you in the conversation. An offline strip appears instead of an empty thread when the connection drops.
- **Cold-start auth errors no longer red-screen** — a failure during the auth bootstrap now surfaces as a recoverable state rather than a crash.
- **Account deletion fixes** — several errors in the delete-account flow are resolved.
- **Daily quotes** — refreshed generator and card.

### Backend

- **`convex/xolacerChat.ts` + Stream integration** — profile publishing and photo upload, the roster/directory query, the request → accept/decline → resume → rate lifecycle (bounded by `MAX_PENDING_REQUESTS` / `MAX_OPEN_CONVERSATIONS`), short-lived Stream token minting, a sweep for stale conversations, and Stream user purging on account deletion. The whole feature sits behind a server-side `status.enabled` flag, so a deployment with it off renders an empty state rather than a broken tab.
- **`sessionSuggestion`** — reads the Understanding already on the session (no new model call, per the Constitution rule) to decide whether the close phase has a xolacer to offer; returns `null` rather than throwing on a bad session, and a lookup failure can never cost the classification write. `chooseCloseOffer` is a pure, tested rule guaranteeing the suggestion and the Bridge card are never on screen together, with a bounded hold so a stalled query still falls through to the Bridge.
- **Blocking + concern reports** (`convex/lib/conversationBlock.ts`, `convex/xolacerChat.ts`, `convex/productFeedback.ts`) — a pure, tested module owns the three block-derived decisions (the block plan, the blocked predicate, and rating eligibility), so list-hiding and rating suppression cannot drift apart. `blockConversation` freezes the Stream channel **first** and writes the row second: if the write fails after a successful freeze the channel is frozen while the row still reads open — confusing but safe, and corrected by calling again, whereas the reverse order would leave a row claiming a block the server is not enforcing. A failed freeze aborts the whole operation. Either participant may block, with no role gate; non-participants are rejected by the existing guard. Blocking an already-blocked conversation is a no-op that makes no second Stream call, but a row closed for any *other* reason is still blockable — only `blocked` and `xolacer_left` stop a pair re-requesting, so noop-ing on all of `closed` would report success and change nothing. Product feedback gains a `concern` kind with optional subject-profile and conversation attribution, its own 2-per-day fixed-window rate-limit bucket selected by kind in both the submit mutation and the can-submit query, and a structural analytics event carrying only *whether* a subject was attached — no free text, no ids. All schema changes are additive (a widened union plus two optional fields).
- **Specialty taxonomy** (`convex/lib/specialties.ts`) — shared source of truth for what a xolacer can declare and how it's phrased to a reader, with test coverage.

---

## [1.7.0] - (2026-07-14)

### Added

- **Premium themes (Xolace+)** — the five real Plus palettes ship, replacing the `ember` / `moss` / `ink` placeholders that had no CSS behind them: **Emerald** (deep green jewel tone), **Rosé** (soft rose gold), **Platinum** (cool steel minimalism), **Velvet** (wine and burgundy), and **Noir** (black and gold). Each has a full light + dark variant declaring the same token set as the base theme. They appear in Settings → Appearance beside the free themes; non-subscribers see them locked and tapping routes to the paywall. Preview-card colors are derived from each theme's own dark-variant tokens rather than hand-picked, so the card matches what the theme actually renders. Premium is **palette only** — all themes keep Space Grotesk, since the per-theme display fonts the designs called for (Recoleta, Canela, Neue Montreal) require paid embedding licenses.
- **Lapsed-subscription theme reset** — `colorThemeId` is persisted locally and re-applied on cold start before the entitlement is known, so a lapsed subscriber would otherwise keep a Plus theme indefinitely. `usePremiumThemeReconciler` (mounted from `RootProvider`) resets to the default theme once the entitlement resolves to not-Plus, and clears the night-mode theme stash so the premium theme isn't revived by the morning restore. Note this **does** discard the choice, unlike the voice preference, which is preserved across a lapse.

- **Custom voice (Xolace+)** — Plus members can now choose the voice that speaks their mirror *and* their vent coda, from a small curated cast: **Sage** (older, unhurried storyteller), **Wren** (warm, soft-spoken), **Vesper** (calm and grounded), and **Ash** (low, gravelly, close to the fire). The picker lives in Settings → Mirror as a new "Voice" section beneath Tone. **Auto** stays the free default — the mirror keeps using your tone-mapped voice and the vent keeps its Witnessed voice. Every named voice carries a play button that previews it (a fixed line, *"I'm here. Take whatever time you need."*) — playable even before you subscribe, since hearing the voice is the point. Free users tapping a voice are routed to the paywall. See `docs/voice-naming.md` for the naming rationale.

- **Cognition Layer: episodic & semantic memory** — the app now remembers you across sessions instead of re-deriving who you are from scratch each time. Every mirror-generating session is composited into an episodic memory (stored in a per-profile vector namespace) so relevant past moments can be recalled during mirror generation, not just the immediately preceding turn. Alongside this, a **semantic profile** — a versioned, AI-written narrative covering recurring themes, emotional signatures, and emotional trajectory — is now built per person and included in mirror prompts. A new "Personal memory" toggle in Settings → Data (on by default) lets anyone opt out; disabling it stops new episodic/semantic writes without touching history already gathered under the Constitution's data rules.
- **Reflection Agent (Phase 3): light pass + consolidation** — the semantic profile updates itself in two tiers, off the critical path. A **light pass** (Haiku) runs after every completed session: it bootstraps a v1 profile on someone's first qualifying session, or patches the existing trajectory in place afterward — cheap, frequent, trajectory-only. A **consolidation pass** (Sonnet, tool-use loop) runs on a longer gate: it gathers evidence from recent sessions and commits a new full profile version (recurring themes, emotional signatures, and trajectory together), advancing the profile's version pointer. Both passes respect the privacy/data-wipe guard used by the rest of the Cognition Layer, and a version can be rolled back via `revertToVersion` without losing prior history.

### Changed

- **Session completion is now durable** — completing a session (finishing the solo exercise, the peer-reflection screen, or choosing "I just needed to say it") now flips the session to `completed` at the moment that work ends, *before* navigating to the session-end screen — not when the user later taps something on session-end. This means closing the app on session-end can no longer strand a session at `path_selected` / `path_in_progress`. Post-session enrichment (mood check, peer-pool contribution toggle) is now recorded separately, as an optional, best-effort patch onto an already-completed session — so skipping it (or closing the app) never costs you the completed state. The peer-pool anonymizer job is now guarded against double-firing if feedback is submitted more than once.
- **Abandoned-session cron reconciliation** — since `path_selected` / `path_in_progress` are now transient (a session should only be caught there if the app died mid-navigation), the abandoned-session sweep reconciles sessions stranded in those states to `completed` (path not finished) instead of `abandoned`, since the mirror was already confirmed by that point.

### Backend

- **`convex/lib/voices.ts`** — new single source of truth for TTS voices: the Plus `VOICE_CATALOG` (client-facing slugs → ElevenLabs ids, which never leave the server), the tone-default map, the vent default, and `resolveVoiceId`. The mirror (`ai/tts.ts`) and vent (`vent.ts`) pipelines now resolve through it. The stored preference is a **slug**, never a raw voice id.
- **Generation-time premium fence** — the voice is gated both at write (`preferences.update`) and again when audio is generated (`process.ts` / `clarify.ts` pass the slug only when `isPremium`; the vent pipeline reads `preferences.getResolvedVoiceSlug`, which re-checks entitlement). A lapsed subscription silently falls back to the default voice **without wiping the saved choice**, so it returns intact on renewal.
- **`finalizeCompletion` (convex/sessions.ts)** — single source of truth for flipping a session terminal and firing the post-session job tail (profile stats update, Reflection Agent trigger, follow-up gate). Called from `completePath`, `completeSession`, and the abandoned-session reconciliation path.
- **`recordPostSessionFeedback`** — new mutation for optional post-session mood/contribution, replacing the fields that used to live on `completePath`'s args. For backward compatibility, `completePath` still accepts `contributedReflection` / `postSessionMood` (deprecated) from 1.6.x store clients and applies them through the same guarded path, and is idempotent when the session is already `completed` (e.g. cron-reconciled) — so deploying this backend ahead of store review can't strand old clients on the session-end screen.
- **`semantic_profiles` refactor** — `createVersion` reworked; new `updateTrajectory` supports both bootstrap and in-place patch, with the same wipe-guard as the trusted `createVersion` path. `emotional_profiles.lastConsolidationAt` tracks the consolidation gate; cleared by `dataWipe` alongside existing profile-version purging.
- **Tone adaptation (Phase 4, Loop #1)** — the semantic profile's "what lands" / calibration section now writes itself, so the mirror learns each person's response style over time instead of treating tone as a fixed label. It is **deterministic** (no model call, per the Constitution rule): rule-code reads the longitudinal signal the pipeline already captures — confirmation outcomes, mirror lengths, tone tallies, post-session mood — and emits a short directive only when the evidence is conclusive (claim strength from confirm rate, mirror-length preference, best-landing tone, and an accompaniment-vs-resolution posture), staying silent on thin or middling signal. It runs as a final durable step of the consolidation workflow, on the same 5-sessions / 7-days cadence, patching calibration in place onto the current profile version through a new sanctioned `writeCalibrationInternal` path (wipe-guarded, with a v1 bootstrap). The mirror articulator already reads this section, so no prompt change was needed. The best-landing-*tone* directive stays dormant for now (today `toneUsed` echoes the user's preference, so there's no cross-tone signal yet); the other calibration directives are live.
- **Uncertainty routing (Phase 4, Loop #2)** — the mirror now adapts its **claim strength** to how sure the read actually is, instead of asserting every mirror with the same confidence. It is **deterministic** (rule-code, never agentic — the hot path stays System 1 forever): a new `routeUncertainty` gate reads the classifier's own `primaryEmotionConfidence` × `specificity` and picks one of three postures — *tentative* (low/low: offer the mirror as a naming that invites correction, easy to say "not quite" to), *confident* (high/high: name it precisely, no hedging), or *measured* (the normal path). The articulator renders a matching Claim Strength block that composes with Loop #1's longitudinal calibration — the calibration is the prior about this person, the routing is the evidence about this moment. It runs on both the initial mirror and the refinement pass (where a "not quite" turn can never carry a confident posture — it floors to measured). Claim strength is a pure function of confidence and specificity, both already in `emotional_metadata`, so nothing new is persisted; it is recorded on the `mirror_delivered` / `clarify_delivered` analytics events for the eval harness. Doubles as the Plus model-tiering lever (deferred until that infra lands).
- **Memory relevance feedback (Phase 4, Loop #3)** — episodic memories now earn their place in the mirror instead of accumulating as flat noise. Each session carries a salience weight (`episodicImportance`, 0.2–1) mirrored into the RAG vector's native importance, which scales how strongly that memory surfaces in future searches. When a later mirror **lands** (`confirmed`) with a memory in its `episodicMatchKeys`, that memory's weight is bumped; when the user **gives up** on the mirror (`gave_up`), it decays — growth gentler than decay, floored so a memory sinks but is never erased (`refined`/`abandoned` are too noisy to attribute, so they're left alone). This is **rule-code, off the hot path**: the confirmation tap returns immediately and a scheduled background action does the re-embed. Research on `@convex-dev/rag` 0.7.5 showed importance has no in-place setter — every change re-embeds — so the weight lives in `emotional_metadata` as a cheap, transactional source of truth that's re-applied on every (re-)ingest, and the (bounded, K≈3) re-embed is paid only when a weight actually moves. This is why Understanding records `episodicMatchKeys`.
- **Rate limits** for the light and consolidation passes, so the Reflection Agent can't be triggered into a runaway loop.
- **`patternSummary` split** for targeted usage — the classifier and mirror generator now request differently-scoped summaries instead of sharing one general-purpose blob.
- Minor RAG fixes across `episodicMemory.ts`, `rag.ts`, and `reflectionsRag.ts`.

---

## [1.6.1] - OTA Update (2026-06-27)

### Added

- **Follow-Up Check-In** — sessions that leave something unresolved now trigger a warm check-in card a day or so later. The AI classifier flags sessions that qualify (escalation, grief/shame at high intensity, unconfirmed mirrors, or a `gave_up` — where the AI couldn't reflect you back); a Haiku-generated card text, written per-session and referencing the actual moment, surfaces in a bottom sheet the next time you open the app. The sheet asks one question ("how's it sitting now?") with tier-aware response chips: acute/crisis cards surface only "Still sitting with it" / "Feeling lighter" (anything more would read glib at 45 minutes); elevated and standard cards add "Got heavier" and "I worked through it". A separate "Let it out" doorway routes to Voice Vent for those who need to speak rather than tap. A resources link appears on cards derived from escalation sessions. Tapping any chip logs the response and closes the sheet gracefully.
- **Weight-tiered follow-up cadence** — check-in timing adapts to what was shared. Acute (crisis): first ping at 45 min, second at +4 h, expires at 48 h. Elevated (grief/shame intensity ≥ 7, `gave_up`, elevated safeguard): 12 h / +1 d / 7 d. Standard: 24 h / +3 d / 14 d. Push notifications for Elevated and Standard include the card text; Acute pushes use presence-anchored copy that references *when* something was processed without naming the wound.
- **Follow-up section on the Profile screen** — active and recently resolved check-in cards are visible in the Profile screen's new "Follow-Ups" section, so you can return to a card even if you dismissed the sheet early or missed the push.
- **Supersede policy** — a new qualifying session cancels the active follow-up workflow and starts a fresh one, but only when the new session's weight tier is equal to or higher than the active tier. A casual standard session cannot silently cancel an active crisis check-in. Superseded cards remain visible in the Profile (labelled "unresolved, no check-in coming") until explicitly dismissed.

### Backend

- **`follow_up_cards` Convex table** — stores per-session check-in cards (`profileId`, `sessionId`, `tier`, `cardText`, `status`: pending → ready → resolved/expired/superseded, push timestamps, and response). Indexed `by_profile_created` and `by_profile_status`.
- **`startFollowUpWorkflow` / `followUpCadence`** — durable `@convex-dev/workflow` orchestrates the sleep-and-nudge ladder. Sleep durations are passed as `workflow.start` args (not in-body constants) so cadence tuning never reshapes the workflow journal. At most one active follow-up per profile; idempotent `status === "pending"` guard prevents double-fires on multi-device foreground events.
- **`followUpCardWriter` prompt** — Haiku action writes the card text off the critical path after session completion, referencing the mirror and classifier output. Falls back to a static `FALLBACK_FOLLOWUP_CARD` on model outage so safety-relevant follow-ups are never silently dropped.
- **`follow_up` notification type** — `notifications.ts` gains a dedicated `followUpNudge` rate-limit bucket (separate from `gentle_return` / `pattern_nudge`) so follow-up pushes never starve or are starved by other nudge types. Follow-up notifications are gated only by `notifications.enabled` — no per-type toggle at this stage.
- **`requiresFollowUp` classifier flag** — finalized at session completion (not mirror delivery), because `gave_up` is only known after the clarify loop closes. Stored on `emotional_metadata` alongside other classifier output; the operational gate lives on `sessions`.
- **Eval coverage** — `requiresFollowUp.eval.test.ts` covers ~15–20 labeled inputs (live Haiku, `bun:test`) to catch prompt regressions.

### Changed

- **Activity variant** — minor copy and layout adjustments on the session-end activity screen.
- **`auth.ts`** — minor internal fix.

---

## [1.6.0] - Released (2026-06-19)

### Added

- **Feedback Tray (shake-to-summon)** — a chrome-free way to talk back to us, with zero pixels on any screen until you summon it. Shake your phone anywhere in the app to float up a small tray over whatever you're doing: report a bug or suggest an idea, written into a single form with a bug | idea toggle. The tray is a self-contained surface with its own internal back-stack (menu → form → back) — it never touches app navigation and never routes to a real screen. It rides up with the keyboard, drags down or taps-the-backdrop to dismiss, and reads every color from theme tokens so it looks right across light, dark, and all five color themes. A blurred scrim sits behind it. Critically, the trigger is **state-aware**: a shake is honored in `idle`, on the mirror, and on every secondary screen, but suppressed during active articulation (`typing` / `typing-nudge` / `processing`) so it never interrupts you mid-thought. A one-time toast ("Shake your phone anytime to send feedback") makes it discoverable, then never repeats.
- **What's New** — a "What's new" row in the tray opens a warm, plain-language changelog of recent releases. An accent dot marks the row when there's an update you haven't seen yet; opening the list clears it. OTA updates are tracked with their own stable key (not the store version) so the badge logic stays correct across OTA patches.
- **Profile screen** — a personal, progressively-revealed reflection of your time in the app, reachable from the idle screen. It opens on an aurora-arc header with your name, when you started, and how many moments you've processed. As you accumulate sessions, more unfolds: a stat band (moments, current streak, your usual day), the emotions that show up most for you, and "mirror lines" that read back your mood shift and rhythm. Below an "your insights" divider sit early looks at deeper analytics — a week-intensity chart and the words you reach for — presented as teasers (softly fogged, no padlocks) with a one-tap waitlist to register interest in the full insight layer. Everything is gated by how much you've shared (1 / 3 / 5 sessions), so an empty profile never feels empty — it just shows what's there.

### Changed

- **Expo SDK 56 migration** — upgraded from SDK 55 to **Expo SDK 56**, bringing **React 19.2.3** and **React Native 0.85.3**, with all `expo-*` modules realigned to their SDK 56 versions. Notable companion bumps: `react-native-reanimated` 4.3.1, `react-native-worklets` 0.8.3, `react-native-gesture-handler` 2.31.1, `react-native-screens` 4.25.2, `react-native-safe-area-context` 5.7.0, `react-native-svg` 15.15.4, and `@shopify/react-native-skia` 2.6.2. HeroUI Native styling and the bottom-sheet package were bumped alongside.
- **Settings screen restructure** — settings was reorganized into grouped navigation rows with dedicated sub-screens and custom RadioGroup icons (see the settings-refactor work), tidying the surface ahead of the profile screen linking into it.

### Backend

- **`product_feedback` Convex table** — bug/idea submissions land in a new, dedicated table (kept separate from the emotional `feedback` table so product feedback never pollutes the longitudinal emotional dataset). Each row carries the kind, trimmed/length-bounded text, and structural context (app version, route, theme, platform). Owner scope is derived server-side via `requireAuth` — the client never passes a user id — and submission is rate-limited (`productFeedback`, 10/day per profile) since a shake-summoned form is easy to spam.
- **`insight_waitlist` Convex table** — registers interest when a user taps to unlock a teased insight (intensity history, words/language), so the full insight layer can be prioritized against real demand.

### Analytics

- Structural-only PostHog events (no free-text content): `feedback_tray_opened` (`{ source, route }`), `product_feedback_submitted` (`{ kind }`), and `whats_new_opened`.

---

## [1.5.0] - (2026-06-13)

### Added

- **Voice Vent** — a voice-first release ritual ("I released something real"). Reachable from the idle menu, it opens a full dark screen where you speak something heavy aloud and then watch it burn away. A Skia particle field (80–120 soft glowing particles, rendered on the UI thread) reacts to your voice in real time: ash-gray and still at rest, warming from center outward toward amber as your volume rises. Tapping stop runs a four-beat dissolution — compression inward, a white-amber flash, an uneven outward scatter, then one full second of silence. The dissolution is the emotional peak; only after it does a short 1–2 sentence acknowledgement (the "coda") fade in and speak aloud, before resolving to "Gone." and auto-returning home. A pinch-spread gesture during the burn jumps straight to the explosion — if the user chose to release, it's honored instantly.
- **First-time vent intro** — a sparse, slow version of the particle field behind the promise: "This is a space to say the unsaid. Your voice is never stored. It goes when you close." Gated on a `ventIntroSeen` Zustand toggle (persisted), shown once before the first vent.
- **Vent sound design** — a burning-paper crackle plays at the scatter beat (the emotional payload of the ritual), timed to fire after the compression + flash and entirely after the recorder has stopped, so it never disturbs the metering-driven particles.
- **Mic button states** — a 56–64px circle: a gently pulsing ring at idle, a solid warm-amber ring while recording (icon swaps to a stop square), fading to nothing as the burn begins.
- **Awareness Events** — a campfire-side way to acknowledge what a given month holds (e.g. Men's Mental Health Month). When an event is live, a detached bottom sheet greets the user on the reflect screen: a title, an optional cover image (skeleton placeholder while it loads, graceful fallback if it fails), a scrollable body under a pinned header and footer, and an optional external-link button in the header that opens the full article in an in-app browser. Events can carry an optional CTA (e.g. "Find support") that routes to an allowlisted in-app destination (currently crisis resources). Dismissing offers context-aware copy — "Not right now" when a CTA is present, "I see this" otherwise. The sheet only appears after the founder welcome sheet is dismissed and the reflect screen is focused, so prompts never compete.
- **Event session prompts** — when an event defines a `sessionPrompt`, dismissing the sheet (via any action) seeds the reflect idle screen with that prompt for up to 7 days. The reflect header swaps its headline to the event's prompt and shows an "event pill" (heart icon + event label, e.g. "This month") above the encouragement line — only during the day, and never while a Quiet Return prompt is active, so the two never collide. The prompt clears automatically the moment the user taps to write or after it expires, so it never lingers into an unrelated session.
- **`--event` theme color** — a dedicated rose/magenta "monthly awareness marker" color (`--event` / `--event-foreground`) added to the base light/dark themes and all five color themes (quiet, reverie, human, nightly, alpha), in both variants. Used by the event pill so the marker reads consistently across every theme.
- **`monthlyEvents` Convex table** — privacy-first, team-managed content table with `slug` (immutable seen-tracking key), `title`, `body`, optional `ctaLabel`/`ctaRoute`/`sessionPrompt`/`imageUrl`/`linkUrl`, `startDate`/`endDate` (ISO `YYYY-MM-DD`, compared client-side in local timezone), and `priority`. Indexed `by_slug` and `by_priority`. Reads go through an auth-gated `getActive` query; content is seeded via an idempotent `seed` internal mutation (safe to re-run, skips existing slugs).
- **Seen-event tracking + analytics** — dismissed events are remembered locally in Zustand (`seenEventIds` as `{ slug, seenAt }`) so an event never re-shows after it's been dismissed, even across force-quit. PostHog captures `awareness_event_shown`, `awareness_event_dismissed`, `awareness_event_cta_tapped`, and `awareness_event_link_tapped`. Dev tools gain a control to clear the pending event prompt.

### Privacy

- **Vent transcripts are never stored** — at any point in the pipeline. Audio is ephemeral: it's transcribed in-flight, used to generate the acknowledgement, and discarded. Only safety-flag metadata can persist. The intro screen's promise ("Your voice is never stored. It goes when you close.") is enforced end-to-end.

### Backend

- **Vent AI pipeline (`convex/vent.ts`)** — `processVentAudio` runs Scribe v2 speech-to-text → crisis check → a Claude Haiku acknowledgement (1–2 sentences, enriched with ElevenLabs audio tags like `[sighs]`/`[soft]` for warmth) → ElevenLabs TTS (`eleven_v3`, a "witnessed" voice). Every stage fails soft and returns `null` — the destruction animation always plays regardless of whether the AI succeeds. On-screen words have the audio tags stripped; the TTS keeps them.
- **Daily voice cap** — voice processing is gated behind a per-user daily cap (`ELEVENLABS_DAILY_CAP_MINUTES`, default 2) charged transactionally in `checkAndIncrementCap`, with a lazy per-day UTC reset. New `emotional_profiles` fields `ventDailyMinutesUsed` / `ventDailyResetAt`. The charge takes the larger of the client-claimed duration and the duration implied by payload size, so a tampered client can't under-report. A `capReached` flag lets the client distinguish "limit reached" from a genuine (silent) pipeline failure.
- **Crisis handling** — a keyword pre-filter is confirmed by OpenAI moderation (fail-safe: if moderation is unavailable, the crisis flag stands). Confirmed crisis returns a single static line ("you don't have to carry this alone") and never riffs over self-harm content; an idiomatic false positive ("end it… this sprint") is cleared by moderation.
- **Recording ceiling** — capped at 120s client-side to keep the m4a payload under Convex's 1MB `v.bytes()` limit (the daily cap is still charged by actual duration server-side). Also adds `getVentSessionToken` for issuing a short-lived ElevenLabs signed URL.

### Changed

- **`useAwarenessEvent` selection logic** — picks at most one event to show: filters to events whose date range includes today and that the user hasn't already seen, then sorts by `priority` (lowest number first) and `startDate`. Stale seen-entries are pruned on mount.

### Fixed

- **Seen-event retention now uses true calendar months** — `pruneSeenEventIds` previously approximated the 13-month retention window as `13 × 30` days (390 fixed days); it now subtracts 13 calendar months via `Date.setMonth`, so retention is exact regardless of month lengths.
- **`getActive` is auth-gated** — the events query now calls `requireAuth` before reading, for defense-in-depth. This content is only ever shown inside the authenticated app, so there's no reason to expose it publicly.

---

## [1.4.0.1] - OTA Update (2026-06-10)

### Added

- **`mood_unsure` feedback** — contextual bottom sheet appears when a user taps "unsure" on the session-end mood check (throttled to once per 24 h). Four option cards: "Felt okay while here", "Still processing", "Too many things at once", and "Something else" with optional free text (max 300 chars). Backend: new `canAskUnsureContextual` query and `mood_unsure` type added to the `feedback` table and `submit` mutation.
- **Unified update bottom sheet** — new `UpdateBottomSheet` component replaces native `Alert.alert()` for both OTA-ready and new-store-version prompts. Both modes share one sheet with copy tuned to the context ("Refresh Now" for OTA, "Download Now" for store updates) and a dismissible "Later" option.

### Changed

- **`mood_heavier` feedback redesigned as a bottom sheet** — `HeavierFeedbackPrompt` is now driven by a dedicated `FeedbackSheet` bottom sheet with a `FlameIntensitySelector` for expressing intensity level, replacing the previous inline card in the session-end activity variant.
- **Clarify mirror-miss feedback uses option cards** — removed the raw `TextInput` ("What was off? optional") from `ClarifyState`. Mirror-miss feedback now surfaces through a `ClarifyFeedbackCard` tap target that opens a `ClarifyFeedbackSheet` with four predefined options ("Wrong emotion", "Too surface level", "Close but not quite", "Missed the main thing"). `mirror_miss` submissions now require `selectedOption` rather than free text.
- **`useVersionCheck` / `useOtaUpdate` refactored to callbacks** — both hooks now accept `onVersionChecked` / `onUpdateReady` callback props instead of owning their own `Alert` calls. The root layout is now the single owner of update state and drives `UpdateBottomSheet` from there; hooks only signal readiness.
- **Session-end activity CTA migrated to `Button`** — the mood-check continue/skip button in `ActivityVariant` now uses HeroUI Native `Button variant="outline"` instead of a raw `PressableFeedback`.

---

## [1.4.0.0] - (2026-06-01)

### Added

- **Trusted Bridge** — turns what you felt in a session into a message you can actually send to someone who matters. Reachable from a suggested card on the session-end screen. A one-time intro explains the promise and privacy model, then you name who you're writing to (name, relationship, and how you address them); the AI drafts a message shaped around your session's emotional context via Anthropic. You edit the draft inline and share it through the native share sheet, or step away with "Not right now" — nothing sends itself. Privacy-first: recipient details are used only to generate the draft and are never stored. Intro-seen and feature-enabled state persist via Zustand; PostHog captures bridge open/dismiss and share events.

### Changed

- **React Compiler memoization cleanup** — removed all manual `useMemo`, `useCallback`, and `memo()` calls used purely for performance across ~45 files; the React Compiler (`reactCompiler: true`) handles memoization automatically via `useMemoCache`. Retained intentional exceptions: context provider `value` objects, `useCallback` on `useEffect` deps, and `memo()` on components with `"use no memo"` directives. ESLint rules `react-perf/jsx-no-new-object-as-prop` and `react-perf/jsx-no-new-array-as-prop` disabled as false positives under the compiler.
- **Reanimated shared value API migration** — migrated all `.value` reads and writes on Reanimated shared values to the React Compiler-compatible `.get()` / `.set()` API across 19 files (`auth-bg`, `animated-row`, `menu-buttons`, `menu-trigger`, `ember-orb`, `mood-card`, `mood-marquee`, `paths-preview`, `peers-preview`, `reflect-preview`, `share-preview`, `circle-progress`, `quotes-screen`, `breathing-orb`, `mic-button`, `contributed-confirmation`, `paced-orb`, `haptic-beat`, `use-menu-state`). Menu toggle uses functional setter `(prev) => !prev` for atomic UI-thread read-compute-write.
- **Dialog state reset pattern** — `SpaceNameDialog` and `FeedbackDialog` now use a mount/unmount inner component pattern (`{isOpen && <Form />}`) instead of `useEffect` to reset form state on open. State initializes from props on mount; no cascading renders.
- **CLAUDE.md best practices** — documented React Compiler memoization rules and Reanimated `.get()`/`.set()` guidance to prevent regressions in future agent sessions.

### Fixed

- **Solo "Done" bounced to home instead of session-end** — the sit-with-this screen was calling `completePath()` before navigating, flipping the session to a terminal state. With no active session, the session-end "no active session" guard fired `router.replace('/')` and bounced the user home. It now defers completion to the session-end screen (matching the peer and exit paths), navigating to `session-end?path=solo&completed=true|false` and threading the finished-vs-exited-early flag through so completion records the correct outcome.
- **Bridge card bounced to home instead of the bridge screen** — `completeAndBridge` completes the session (turning it terminal) and then pushes the trusted-bridge screen; because session-end stays mounted underneath, its "no active session" guard raced and `router.replace('/')`'d on top of the pushed bridge. A latent race since the bridge was added, made deterministic once the bridge screen grew heavier. Fixed by claiming navigation (`navigatedRef.current = true`) before the push, so the guard's `navigateHome()` no-ops.

---

## [1.4.0.0] - (2026-05-29)

### Added

- **Reflect screen tour guide** — a one-time, 4-step popover tour that greets new users on the idle reflect screen. Each step anchors to a key input element: the write area, the mic button, the texture word tags, and the word-set tabs. Steps advance on any tap; a Skip button exits at any point. The tour only starts after the founder welcome sheet is dismissed, so the two never compete. Night Mode users see 3 steps (word-set tabs are hidden at night). Tour completion and skip events are captured in PostHog (`tour_started`, `tour_completed`, `tour_skipped`). State is persisted via Zustand so the tour never repeats. Navigating away mid-tour (e.g. tapping the Help button in the header) auto-dismisses the tour cleanly via a navigation blur listener.

### Fixed

- **Help button in reflect header** — a "Help" button (crisis resources shortcut) now appears in the native stack header on the reflect screen's idle state only; it is invisible in all other states (typing, processing, mirror, etc.). The header is transparent with no visible bar — the button floats at the top-right. Tapping it navigates to the crisis resources screen.

### Changed

- **Session-end close screen** — removed the ambient ember glow circle behind the "Have more? I'm here." and "Done" buttons on both the activity and exit variants; the close phase is now clean and uncluttered.
- **Session-end acknowledge screen** — mascot illustration (`jump-love-bgremove`) now fills the upper space of the acknowledge phase on both the activity and exit variants, replacing the empty void. Text sits below the mascot, bumped to `text-3xl` for more presence. Placeholder for the upcoming looping mascot video (requires a future store release).
- **Session-end offer screen** — title size increased to `text-3xl`; subtitle copy updated to "Someone out there might be carrying something just like this."
- **Contributed confirmation screen** — replaced placeholder with an ember particle animation (7 particles, staggered timing, single `progress` shared value pattern) rising above a soft glow. Message and Done button fade in sequentially.
- **Mirror tone badge** — now reads `toneUsed` from the session record rather than the user's current tone preference setting. The badge reflects the tone that actually generated the mirror, not what the user has set today.

### Fixed

- **White background flash on navigation** — `ThemeProvider` now detects all dark theme variants (`quiet-dark`, `nightly-dark`, `reverie-dark`, etc.) by checking `theme.includes('dark')` instead of strict equality; fixes the white flash when navigating between screens on any non-base dark theme.
- **Push token fetch crash on 503** — `getExpoPushTokenAsync` is now wrapped in a try/catch; a transient Expo service error no longer surfaces as an unhandled promise rejection. The token registers normally on the next launch.

---

## [1.3.0.0] - App Store release (2026-05-22)

### Added

- **Daily quotes** — a personalized AI-generated quote delivered each day, distilled from your session patterns without ever reading raw input; privacy-first with idempotency checks and separate curated/session-derived paths
- **Quote reactions** — heart-burst reaction on your daily quote
- **Quote sharing** — share quotes as a polished card (glass effect, gradient, campfire mascot, theme-aware palette) via native share sheet; supports image save and SMS
- **Weekly quote notifications** — scheduled push notifications surface your weekly quote at the right moment
- **Session-end notification nudge** — lightweight prompt at session end to enable notifications so quotes land reliably
- **Quote preference setup** — onboarding sheet to configure quote delivery preferences
- **Mirror tone tracking** — tone is tracked across the session and displayed as a badge on the mirror; "witnessed" added as a new mirror tone
- **"Witnessed" TTS support** — read-aloud is now available for the witnessed mirror tone using the same voice as the adaptive tone

- **Android haptics** — Android now has full premium haptic feedback via `react-native-pulsar`. Previously Android had no haptics (expo-haptics was a no-op on the devices we support); every emotional moment in the app now has a distinct, intentional feel on both platforms
- **Haptic identity across 13+ moments** — each key interaction has a unique pattern: mirror arrival (`herald` — 3-beat crescendo), session complete (`bloom`), processing breath (`breath`), form submit (`propel`), error state (`wobble`), escalation/crisis mount (`peal`), peer reflections mount (`murmur`), quote reactions differentiated (`chirp` for resonates, `wane` for not today), per-mood session-end feedback (`chirp`/`plink`/`plunk`/`murmur`), anonymous contribution confirmation (`dewdrop`), carousel slide advance (`flick`), theme selection (`sonar`), menu open/close differentiated (`thud`/`flick`)
- **Preset preloading** — 13 frequently-used presets are warmed at app boot so the first haptic on any critical path (mirror arrival, submit) fires without latency
- **Duration-matched breath haptics** — the sit-with-this breathing exercise now uses `usePatternComposer` continuous patterns that swell and release in exact sync with the orb animation (inhale: 0.35→1.0 over 3–4 s, exhale: 1.0→0.0 over 6–8 s) instead of single-shot preset approximations

### Changed

- `react-native-pulsar` replaces `expo-haptics` as the Android/web haptic layer; iOS continues to use CoreHaptics for non-breath patterns
- Updated breathing animation in exercises to be more natural

---

## [1.2.0.0] - OTA Update (2026-05-20)

### Fixed

- **Error state heading** — replaced "Something didn't go as expected." with "Take a breath." across all error types (rate limit, generic, session expired); better fits the app's emotional tone
- **Crisis resources disclaimer** — corrected "BetterHelp cannot vouch…" to "Xolace Inc cannot vouch…"
- **Ghana phone number format** — fixed malformed `2332-444-71279` to correctly split country code as `233-2-444-71279`
- **Founder welcome copy** — "We will love to walk this journey" → "We'd love to walk this journey"; "on" → "at"; added `+233` country code to WhatsApp/SMS number for international users
- **Mirror tone badge colors** — replaced hardcoded Tailwind color classes (`text-purple-400`, etc.) with theme-aware CSS variables (`text-tone-poetic`, etc.); tone colors now adapt correctly across all 6 themes (alpha, quiet, reverie, human, nightly, and base)

---

## [1.2.0.0] - App Store release (2026-05-15)

### Added

- **Crisis resources screen** — standalone "Get Help Now" screen with country-aware emergency numbers and hotlines for 5 countries (Ghana, US, UK, Australia, Canada). Includes a one-tap emergency call button, country selector (bottom sheet), staggered resource list, and a disclaimer footer with a correction email link. All `Linking.openURL` calls are guarded and surface failures via toast.
- **Help button on idle screen** — a quiet warning-palette pill ("Help") in the top-right of the reflect idle state navigates to the crisis resources screen. Uses a lifebuoy SF Symbol. Label is "Help" not "Crisis" to lower the activation threshold.
- **`ResourceItem` shared component** — `src/components/shared/resource-item.tsx` extracted for reuse across crisis screen and escalation state. Handles phone/url/email (tappable with `PressableFeedback`) and text (non-tappable) resource types, with per-index stagger animation.
- **`LSApplicationQueriesSchemes`** — added `tel` and `mailto` to `app.config.ts` iOS infoPlist to ensure `Linking.canOpenURL` works correctly on all iOS versions.

- **Feedback mechanism** — four feedback types to understand where the product is losing users:
  - `general` — "Send feedback" dialog in Settings → Support section; rate-limited to 5 submissions per 24h
  - `mood_heavier` — contextual prompt at session end when user selects "heavier" mood; throttled to once per 24h; three option cards with optional "Something else" free-text field
  - `mirror_miss` — fire-and-forget field in the Clarify state; captures what was off with the AI mirror without blocking the user's flow
  - `gave_up` — fire-and-forget card in the Gave Up state; three options surfacing why the user stopped
- **Feedback Convex backend** — new `feedback` table with `by_profile` and `by_profile_and_type_and_created` indexes; `canAskContextual` and `canSubmitGeneral` queries; `submit` mutation with per-type server-side validation and rate limiting via `@convex-dev/rate-limiter`
- **"Have more? I'm here." link** — now uses accent color at 60% opacity (matching "your timeline") so it reads as interactive without pressure
- **Data lifecycle** — feedback records deleted on data wipe and account deletion

### Changed

- `canSubmitGeneral` uses `@convex-dev/rate-limiter` component (`generalFeedback: fixed window, 5/day`) instead of a manual table scan
- `activity-variant.tsx` wrapped in `ScrollView` to handle heavier feedback prompt without overflow
- `use-reflection-machine.ts` now exposes `turnsCount` for use as `turnIndex` in mirror-miss feedback
- **Animation layer migrated to `react-native-ease`** — replaced `react-native-reanimated` entering/exiting presets (`FadeIn`, `FadeInDown`, `FadeOut`) with declarative `EaseView` across 33 components; covers onboarding, auth, reflect states, sit-with-this, peer-reflection, and session-end screens; exit animations (feedback cards, notification banner, pre-roll card) converted to `visible`/`mounted` state pattern with `onTransitionEnd`

---

## [1.1.0.0] - App Store release (2026-05-12)

### Added

- **Voice input** — speak your reflection instead of typing; voice is transcribed automatically
- **Mirror read-aloud** — after the mirror is delivered, it can be heard in a voice that matches the tone you're in
- **Mirror navigation during clarify** — users can navigate back to the previous mirror while clarifying so they're always working from what was said

### Changed

- **Onboarding rebuilt** — smoother animations and a clearer sense of what Xolace is before logging in
- Bug fixes and polish

---

## [1.0.0.0] - 2026-05-13

Initial release. Core reflect loop, session end, timeline, settings, onboarding, and authentication.
