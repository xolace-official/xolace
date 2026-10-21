# R2 — Acquisition attribution: what source signal is already available

Research for wayfinder ticket [#231](https://github.com/xolace-official/xolace_app/issues/231),
child of map #229 (post-signup onboarding: founder message + early Xolace+
paywall + low-friction segmentation questionnaire that captures acquisition
source). Readers: **T2** (acquisition metric) and **T3** (onboarding data model).

Primary sources only: `app.config.ts`, `package.json`, `src/config/posthog.ts`,
`src/providers/root-provider.tsx`, `src/lib/use-posthog-identity.ts`,
`src/app/_layout.tsx`, `src/features/auth/use-provider-sign-in.ts`,
`src/features/purchases/revenuecat-context.tsx`, `convex/premium.ts`,
`convex/schema.ts`, `node_modules/convex-revenuecat/src/component/schema.ts`,
live PostHog project 396459 (via `execute-sql` on the `persons` catalog), live
RevenueCat project `proja48d0493`, and the Google / Apple / RevenueCat / PostHog
platform docs cited inline. Builds on R1
(`git show research/r1-implicit-explicit-coverage:docs/notes/r1-onboarding-data-coverage.md`) —
does not re-derive its person-property inventory.

---

## 0. The one-line answer

**Nothing about acquisition source is captured today — zero install-referrer
wiring, zero UTM/campaign capture, zero RevenueCat attribution, zero
deep-link-param handling, and no `source`/`channel`/`referrer` field in Convex
or PostHog.** The only channel-adjacent signals that exist are `auth_provider`
(apple/google — a login-method proxy, not a channel), `$geoip_*` country, and
the app-store-vs-sideload distinction implicit in `store` on a purchase. Every
acquisition channel the map cares about — organic search, paid, TikTok/series,
referral, website, socials — currently lands as the **same undifferentiated
"direct / unknown" blob**. The explicit onboarding question is not a
nice-to-have refinement on top of automatic signal; it is the *only* signal.
The automatic layer that would normally disambiguate paid-vs-organic and
attribute a specific campaign is a separate infra build (§5), and even fully
built it never answers "a friend told me" or "I saw the TikTok series" — those
are the irreducible core of the question (§3).

---

## 1. Platform install-referrer APIs — what they give, and what this app wired

### Android — Google Play Install Referrer API

- **What it gives:** `com.android.installreferrer:installreferrer` →
  `InstallReferrerClient.getInstallReferrer()` returns an `InstallReferrerDetails`
  with `getInstallReferrer()` (a URL-encoded query string), plus
  `getReferrerClickTimestampSeconds()`, `getInstallBeginTimestampSeconds()`,
  `getGooglePlayInstantParam()`. For an **organic** Play Store install the
  string is `utm_source=google-play&utm_medium=organic`; for a **campaign**
  install it is whatever `&referrer=` value was appended to the Play Store URL
  (your own UTM tags, a `gclid` for Google Ads, or an arbitrary string you
  control on your own share links). It is a **one-shot** read — you must fetch
  it soon after first launch and persist it yourself; the connection must be
  established and closed once. Source: Google Play "Get referral content"
  developer docs (`developer.android.com/google/play/installreferrer`).
- **What this app wired:** nothing. `grep` for `installreferrer`,
  `InstallReferrer`, `getInstallReferrer` across `src/` and `android/` returns
  zero hits. `package.json` has **no** `react-native-google-play-install-referrer`
  and no Expo module that surfaces it. `expo-application` *is* a dependency
  (`package.json`) but it is imported nowhere in `src/` (grep: zero hits) and in
  any case only exposes `getInstallReferrerAsync()` on Android — still unused.
- **Actively disabled:** `app.config.ts:156-161` puts
  `com.google.android.gms.permission.AD_ID` in `android.blockedPermissions`, so
  the advertising ID is not collected — no GAID-based network attribution is
  possible without reversing that decision.

### iOS — there is no general "install referrer"

Apple provides no equivalent of the Play referrer string. The options, all
narrower:

- **Apple Ads Attribution (AdServices framework):** `AAAttribution.attributionToken()`
  (iOS 14.3+) yields a token you POST to `https://api-adservices.apple.com/api/v1/`
  to receive `campaignId` / `adGroupId` / `keywordId` / `attribution` bool.
  **Apple Search Ads only** — it says nothing about TikTok, a website link, or a
  friend's recommendation. Source: `developer.apple.com/documentation/adservices`.
- **SKAdNetwork / AdAttributionKit:** privacy-preserving install postbacks sent
  to the *ad network*, aggregated, with a coarse conversion value. Not readable
  in-app, not user-level, not a source of truth you can join to a person.
- **Universal Links:** if the user tapped an `applinks:` URL, iOS hands the
  full URL to the app on first open, so campaign params on that URL survive.
  There is **no deferred deep link** natively (link tapped → App Store →
  install → first open loses the URL); that needs a third-party SDK (Branch,
  AppsFlyer) or a fragile pasteboard hack.
- **What this app wired:** nothing. No `AdServices`, no SKAN config beyond the
  OS default, and **no Universal Links at all** — `app.config.ts` sets only
  `scheme: "xolace"` (`:62`); there is no `ios.associatedDomains`, no
  `android.intentFilters` with `autoVerify`, and no `+native-intent.tsx`
  (`ls src/app/+native-intent*` → no match). Custom-scheme links (`xolace://…`)
  work, but a marketing URL pasted from a TikTok bio or a website button will
  **not** open the app, so there is no organic deep-link path to instrument
  either.

### No third-party attribution SDK anywhere

`package.json` has no `react-native-adjust`, `react-native-appsflyer`,
`react-native-branch`, `@singular/react-native-sdk`, or similar. Attribution
tooling in the project is limited to PostHog (product analytics) and Sentry
(crash/replay).

---

## 2. What PostHog captures on first open today (project 396459)

### SDK wiring

- `posthog-react-native` `^4.43.10` + `@posthog/convex` `^2.0.28`
  (`package.json`). Client instance `src/config/posthog.ts`:
  `disabled: !isPostHogConfigured || __DEV__` (`:25`) — **all client capture is
  off in dev builds** — and `captureAppLifecycleEvents: true` (`:26`).
- Autocapture (`src/providers/root-provider.tsx:27-31`):
  `captureScreens: false`, `captureTouches: true`, `propsToCapture: ["testID"]`.
  Screen views are instead fired manually as `posthog.screen(pathname, {
  previous_screen, path })` (`src/app/_layout.tsx:131-135`) — `path` here is the
  internal Expo Router `path` search-param (used by the `(protected)` guard for
  routes like trusted-bridge), **not** a campaign param.
- `captureAppLifecycleEvents: true` is what emits `Application Installed`,
  `Application Opened`, `Application Updated`, `Application Became Active`. On
  the React Native SDK these carry only `version` / `build` — **no referrer, no
  UTM, no campaign**. `posthog-react-native` has no install-referrer or
  UTM-autocapture code path; `$initial_referrer` / `$initial_referring_domain` /
  `$initial_utm_*` are **web-SDK-only** (they come from `document.referrer` and
  the URL query string, neither of which exists in a native app). Confirmed
  against the SDK: no such properties in the RN client.

### Person properties that actually exist (live, project 396459)

`execute-sql` over the `persons` catalog —
`SELECT arrayJoin(JSONExtractKeys(properties)) … GROUP BY … ORDER BY count DESC`
— returns exactly:

- `$geoip_*` (country code/name, city, subdivisions, lat/long, timezone,
  postal, accuracy, continent) and their `$initial_geoip_*` twins — 469 persons.
- `$os`, `$os_version`, `$device_type`, `$screen_width/height`,
  `$app_version`, `$app_build`, `$app_name`, `$app_namespace`,
  `$app_namespace` (bundle id — distinguishes the dev/preview/prod **variant**,
  not a channel) and their `$initial_*` twins — 469 persons.
- `auth_provider` — 300 persons. Set via `posthog.identify(profileId, { $set:
  { auth_provider } })` in `src/lib/use-posthog-identity.ts:38-41`.
- `first_sign_in_date` — 300 persons. `$set_once` in the same call
  (`use-posthog-identity.ts:42-44`).
- `$creator_event_uuid` — PostHog internal.

**No `$initial_referring_domain`, no `$referring_domain`, no `utm_source` /
`utm_medium` / `utm_campaign` (or `$initial_` variants), no `campaign`, no
`channel`, no `acquisition_source`, no `$initial_utm_*`.** Matches R1's finding;
this note confirms it specifically for the acquisition axis via a live keys
dump rather than a property-search.

### Events with any acquisition flavour

- `user_signed_in` (`src/features/auth/use-provider-sign-in.ts:99-101` &
  `:144-146`) — props `auth_provider`, `is_new_user`. Fired on the **anonymous**
  distinct id (identify happens later in `use-posthog-identity.ts`), so the
  anonymous→identified merge carries it.
- `onboarding_completed`
  (`src/features/onboarding/components/screens/PromiseScreen.tsx:54`) — fires on
  tapping through the intro/Promise screen. **No properties, no source data.**
- `Application Installed` — lifecycle auto-event, version/build only.

None of these disambiguate a channel.

---

## 3. RevenueCat attribution — capable, not wired

- Live project exists: `proja48d0493` "Xolace: AI Mood & Feelings"
  (RevenueCat `list-projects`). Server side is the `convex-revenuecat`
  component, mirrored via webhooks into `customers` / `subscriptions` /
  `entitlements` tables (`convex/revenuecat.ts`).
- **Client never feeds attribution.** `src/features/purchases/revenuecat-context.tsx`
  calls `Purchases.configure({ apiKey })` (`:114`) and `Purchases.logIn(appUserId)`
  — and nothing else. Grep for `setAttributes`, `collectDeviceIdentifiers`,
  `enableAdServicesAttributionTokenCollection`, `setAdjustID`, `setAppsflyerID`,
  `setFBAnonymousID`, `setMixpanelDistinctID` across `src/` → **zero hits**.
  RevenueCat's reserved attribution attributes (`$campaign`, `$adGroup`,
  `$keyword`, `$creative`, `$mediaSource`) are therefore never set. Source:
  RevenueCat "Attribution" docs (`revenuecat.com/docs/integrations/attribution`).
- **The mirror table has a slot for it but it is empty.** The component's
  `customers` table has `attributes: v.optional(subscriberAttributesValidator)`
  (`node_modules/convex-revenuecat/src/component/schema.ts:63`) — a
  `Record<string, {value, updated_at_ms}>` that would hold `$campaign` etc. if
  they were ever set. With no client wiring it holds only whatever RevenueCat
  auto-populates (`$idfv`, store country), which is not marketing source.
- **`sourceEventType` is not attribution.** `convex/premium.ts:88` / `:101`
  passes `sourceEventType` into the `entitlement_activated` PostHog event — this
  is the RevenueCat **webhook event type** string (`INITIAL_PURCHASE`,
  `RENEWAL`, `PRODUCT_CHANGE`…), not a media source. R1's §4 mention of
  "`entitlement_activated.sourceEventType` already exists" should not be read as
  channel data.
- **`store`** on `subscriptions` / `entitlements`
  (`convex-revenuecat/src/component/schema.ts:76`, `convex/premium.ts:17-28`) —
  `APP_STORE` / `PLAY_STORE` / `PROMOTIONAL` / `STRIPE` / `TEST_STORE` etc. The
  only "where did this come from" fact RevenueCat gives for free, and it is
  billing rail, not acquisition channel.
- An **Apple Search Ads integration** *can* be switched on in the RevenueCat
  dashboard (server-side, not visible in the repo) and would then populate ASA
  campaign attributes automatically — worth a 60-second check in the RC
  dashboard's Integrations tab, but nothing in code initiates it and the client
  call `enableAdServicesAttributionTokenCollection()` that ASA attribution
  needs is absent.

---

## 4. Deep links / universal links currently configured

| Thing | State | Source |
|---|---|---|
| Custom URL scheme | `xolace://` only | `app.config.ts:62` |
| iOS Universal Links (`associatedDomains` / `applinks:`) | **none** | `app.config.ts` (no `ios.associatedDomains` key) |
| Android App Links (`intentFilters` + `autoVerify`) | **none** | `app.config.ts` (no `android.intentFilters`) |
| `expo-linking` runtime use (`getInitialURL`, `useURL`, `createURL`, `prefixes`) | **none** | grep `src/` → zero hits; package is installed, unused for inbound links |
| `+native-intent.tsx` (Expo Router deep-link interceptor) | **absent** | `ls src/app/+native-intent*` → no match |
| Expo Router `linking` config override | **absent** | default scheme-based routing only |
| Deferred deep linking (link → store → install → first open keeps params) | **not possible** | no Branch/AppsFlyer; no native support on iOS |

Consequence for T2: there is **no inbound URL surface to attach `?utm_*` or
`?ref=` to** today. A "share Xolace" link in `follow-us-section.tsx` points at
`xolaceinc.com` / social profiles (outbound only). Even organic
website/TikTok-bio taps cannot open the app, so the cheapest automatic
acquisition signal (campaign params on a universal link) is blocked on an infra
change, not just an analytics change.

---

## 5. What is automatically captured TODAY, per channel

| Channel the map names | Automatic signal available today | Confidence |
|---|---|---|
| **Organic App Store / Play search** | Nothing channel-specific. Just `$geoip_country`, device, `auth_provider`. On Play, an unread install-referrer string *would* say `utm_medium=organic` — but it is never read. | none |
| **Paid (ASA / Google Ads / Meta / TikTok Ads)** | Nothing in-app. SKAN/Play postbacks go to the ad network dashboards, not to us, and are not joined to a person. ASA *could* flow through a RevenueCat integration if enabled server-side (unverified). | none in first-party data |
| **TikTok organic / the series** | Nothing. No universal link to carry a `?ref=tiktok`, no deferred deep link. Indistinguishable from direct. | none |
| **Referral (a friend sent me)** | Nothing. No referral program, no invite codes, no `ref` param handling. Nearest existing pattern is `insight_waitlist` intent capture (`convex/schema.ts`, R1 §1). | none |
| **Website (xolaceinc.com button)** | Nothing reaches the app — outbound `Linking.openURL` only, no `applinks:` return path. | none |
| **Socials (IG / LinkedIn / Snapchat / X bio links)** | Same as website — outbound links in `follow-us-section.tsx`, no inbound instrumentation. | none |
| **Login method** (not a channel, but the only split that exists) | `auth_provider` ∈ {apple, google} on 300 persons — PostHog person prop + `users.authProvider` (`convex/schema.ts:40`). Weakly correlated with platform, useless for channel. | high, low value |
| **App variant** | `$app_namespace` bundle id separates dev/preview/prod installs. Not a marketing channel. | high, low value |
| **Country** | `$geoip_country_*` on 469 persons; `Adoption by country` insight `pSX0Pe5R` (R1 §3). A geographic cut, not a channel. | high, adjacent |

**Net: every real acquisition channel resolves to "direct / unknown" today.**

---

## 6. The gap the explicit question must fill

Even a fully built automatic layer (Play referrer read + universal links +
RevenueCat attributes + an ASA integration) would still not disambiguate:

1. **"Someone referred me."** No automatic signal short of a per-user referral
   code / invite link ever attributes a word-of-mouth install. This is the
   single highest-value answer for a mental-health app that grows on trust.
2. **"I saw it in the TikTok series" vs "TikTok ad" vs "TikTok organic post".**
   Automatic tooling at best gives "tiktok" as a media source; it cannot tell
   owned-content (the series) from paid from a random creator mention. The
   series is the founder's named growth bet and needs its own answer option.
3. **"A therapist / friend / article recommended it"** — off-platform
   word-of-mouth with no click. Invisible to every attribution API.
4. **Podcast / newsletter / real-world mention** — same class: no click, no
   referrer, no postback.
5. **Attribution that survives reinstall and device change.** Play referrer and
   ASA tokens are first-install-only and device-bound; a self-reported answer
   stored on the profile is the only source that persists across a reinstall or
   a new phone.

What the explicit question does **not** need to cover (automatic signal is
adequate or will be): country, platform, login method, app-store vs TestFlight,
billing rail — and, once §5's infra lands, paid-campaign-level detail for ad
channels. The question should ask the *human-legible* channel
("search / a friend / TikTok / the series / an ad / a post / somewhere else"),
not try to replace campaign-ID attribution.

---

## 7. Recommendation — where an explicit acquisition answer lives

**Dual-write, same as R1's ruling for every questionnaire answer.** Neither
store alone is sufficient:

- **Convex — new field, canonical.** Add `acquisitionSource` (+ optional
  `acquisitionDetail` free-text or sub-choice, e.g. which series / which
  social) to the onboarding-capture surface T3 is designing. Placement follows
  R1 §5.1: a **new `onboarding_responses` table** (or the new questionnaire
  table T3 lands on), keyed by `emotionalProfileId`, **not** a loose field on
  `users` (which is deliberately thin — `convex/schema.ts:36-45`) and **not**
  `preferences` (that table is for user-tunable settings, and acquisition
  source is an immutable historical fact). Store the raw enum + a
  `capturedAt` + the app `version` at capture time. This is the copy that
  joins to emotional data, survives reinstall, and can personalise later
  ("since a friend pointed you here…").
- **PostHog — person property, for cohorts.** Same write also does
  `posthog.identify(profileId, { $set_once: { acquisition_source: <enum>,
  acquisition_detail: <string> } })`. `$set_once`, not `$set` — first answer
  wins, a later re-onboard or re-install must not overwrite it. This is the
  **only** way T2 can build the "retention / conversion by channel" cohorts R1
  §3 flagged as impossible today (PostHog cannot cohort on a Convex-only
  field). Add it to the same `identify` call that already sets `auth_provider`
  (`src/lib/use-posthog-identity.ts`) — read the answer back from
  `getFullContext` once it exists, so existing installs that never re-run
  onboarding still get backfilled on next app open (the same reasoning the
  identify hook's docstring already uses).
- **Also emit a one-off event** `acquisition_source_selected` with
  `{ source, detail, session_count: 0 }` at answer time, so T2 gets a funnel
  entry point and a timestamp independent of the person-property snapshot.

### How it reconciles with automatic signal

- **Explicit answer is the primary key for channel** in every T2 metric until
  §5's infra exists. Automatic signal, where present, is a **cross-check**, not
  an override:
  - `auth_provider` and `$geoip_country` stay as secondary cuts.
  - If a Play install-referrer read is added later (§5), store it in a
    **separate** field (`installReferrerRaw` + parsed `utm_*`) and never
    silently merge it into `acquisitionSource`. When they disagree
    (referrer says `organic`, user says "a friend"), the **self-report wins for
    the human-channel metric** and the referrer is kept for paid-campaign
    reconciliation. Model them as two columns, reconciled in the query layer,
    exactly as R1 §5.4 says for implicit-vs-explicit generally.
  - If a RevenueCat ASA integration is switched on, its `$campaign` etc. attach
    to the RC customer and can be pulled into PostHog via the RC→PostHog
    integration — again as a **paid-detail supplement** under the user's
    top-level "an ad" answer, not a replacement for it.
- **T3 data-model implication:** one nullable enum + one nullable string is the
  whole schema change on the Convex side; the PostHog side is two keys in an
  existing `identify` call. Cheap. The expensive, deferrable parts (universal
  links, install-referrer module, ASA integration) are **out of scope for the
  onboarding effort** and belong on their own ticket (§8).

---

## 8. Scope flags for the map owner

1. **Graduates the fog:** "acquisition source — automatic signal audit" can be
   marked resolved. Answer: *there is none.* T2 can plan on the explicit
   questionnaire answer being the sole channel input, dual-written to Convex +
   PostHog `$set_once`, with `auth_provider` / country as the only automatic
   secondary cuts.
2. **New ticket, not part of #229:** "Acquisition infra — universal links +
   Play install-referrer + RevenueCat attribution attributes." All three are
   real gaps, all three are independent of the onboarding flow, and the first
   (universal links) also unblocks organic web/social deep-linking generally.
   Sequence it *after* onboarding ships so the self-report is the baseline the
   infra is later reconciled against.
3. **Confirm before T1 writes options:** whether the **TikTok series** is a
   real, near-term, nameable thing users will recognise — R1 already flagged
   the series feature does not exist in the codebase. If it is real, it needs
   its own answer option distinct from generic "TikTok"; if not, collapse to
   "TikTok / Instagram / social".
4. **Cheap win already in place:** the early Xolace+ paywall the map wants
   already has a route group (`src/app/(paywall)/upgrade.tsx`, reads a `surface`
   param) and `paywall_opened` already carries `session_count` + `surface`
   (R1 §3). A `surface: "onboarding"` value is the whole instrumentation change
   — and if acquisition source is captured *before* that paywall in the flow,
   T2 gets channel-attributed paywall-view and trial-start funnels for free.
5. **Dev traffic is invisible** (`disabled: __DEV__`, `src/config/posthog.ts:25`)
   — any manual QA of the new acquisition capture must run on a
   preview/production build to see the events land.
