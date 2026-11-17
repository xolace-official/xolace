# Ideas from the sample apps (full sweep)

Researched 2026-11-16. These are idea sparks, not decisions or port plans.

This sweep covers every repo in `sample apps/` plus Inkigo. Against each idea is the
**redesign prototype** (`Other-projects/xolace-redesign-1`), which is the baseline new
features build on, with the production app as a check. It extends the earlier,
narrower study in [`sample-apps/`](sample-apps/README.md), which covered Companion,
Private Mind and Rakazo. This doc does not repeat that study's ideas; where an idea
builds on one, it says so.

Nothing was filtered out for being unusual. Ideas that fit badly are still listed,
under **Lowest fit**, so the team can make that call.

## How to read this

**Fit** is how well an idea serves what Xolace is built on:

1. **Preventive and proactive.** Xolace speaks first, before things get heavy.
2. **Support that fits the person.** The small real-life things people do for
   themselves, not only meditation.
3. **Dynamic, user-made support.** Support people create in the moment: a sound, a
   tool, a ritual.
4. **Human connection.**

Each idea also gets a fit tier and a novelty tag.

| Fit tier | Meaning |
|---|---|
| **Strongest fit** | Serves two or more of the four foundations, extends something in the redesign, and has no obvious blocker. |
| **Nice to have** | Good and often delightful, but secondary. It may serve one foundation, need a new platform piece (watch, HealthKit, groups), or depend on a strongest-fit idea first. |
| **Lowest fit** | Off-mission, or carries a big safety, security or ethics surface. Kept because the brief said not to pre-filter. |

| Novelty | Meaning |
|---|---|
| `NEW` | No mainstream wellness or mental-health app does this, as far as we know. We compared against Calm, Headspace, Wysa, Woebot, Daylio, Finch, Bearable, How We Feel, Stoic, Rosebud, 7 Cups, Modern Health and Lyra. |
| `RARE` | One or a few niche apps do something like it. The closest one is named where known. |
| `COMMON` | Standard in wellness apps. Listed only when the angle is new. |

The novelty tags are informed judgment from reading code and knowing the market. The
tags on the twelve big bets and the proactivity dial were **checked with web searches
on 2026-11-16**, and several were downgraded; see
[Market check of the big bets](#market-check-of-the-big-bets). Every other tag is
unchecked, so confirm a `NEW` claim before using it in a pitch.

**Surfaces:**

| Tag | Covers |
|---|---|
| mobile | The phone app |
| widget | Home-screen and lock-screen widgets, Live Activities, the Action button |
| channel | Telegram, WhatsApp, SMS, Slack |
| web | The web app |
| desktop | The desktop app |
| cli | The terminal client |
| dev-plugin | Claude Code, MCP, editors, CI |
| b2b | Organizations: employers, schools, clinics |
| watch | Apple Watch and Wear OS |

Paths are relative to the sample repo they come from.

## Sources

| Repo | What it is | What it gave us |
|---|---|---|
| `amber-main` | Save-for-later app with AI filing (Expo + Convex) | Capture from anywhere, AI-suggested spaces, actions the AI can propose, Siri/App Intents, app lock |
| `Medley-main` | Movie, TV, game and book tracker | Upcoming calendar, showtimes near you, mixed lists, radial menu |
| `oyelo-main` | Reading list turned into a private audio library (SwiftUI) | Rewriting text to be heard, pay-before-generate, follow-along text while audio plays, celebration rules |
| `clarity-main` | Speech-practice app with live scoring | Voice metrics, a teleprompter that tracks your voice, evidence-cited coaching, a "words to master" list |
| `endlessly-main` | AI stories for kids: text, images, narration, ambient sound | Generated looping soundscapes, a structured story generator, layered audio |
| `Mora-main` | Nutrition journal you use by chatting | The AI drafts and you confirm, one-question chips, HealthKit on request, eyes-free voice |
| `oddswell-main` | AI sports-analysis app | Code computes the numbers and AI explains them, confidence based on data quality, risk flags |
| `Inkigo-ai-tattoo-try-on-main` | AI tattoo try-on | Previewing something before you commit to it, layered prompts, mood galleries, credit packs |
| `duo-main` (Nimvo) | iPhone as a remote for a Mac | Dimming the desk's screens from the phone, sleep/wake, honest milestone rules |
| `t3code-main` | Control plane for coding agents | Agent lifecycle alerts, guest links, permission modes, snooze/settle/wake |
| `App-main` (New Expensify) | Expense and chat app with AI agents | Plain-language rules, custom agents, whispers, delegates, care-budget patterns |
| `social-app-main` (Bluesky) | Decentralized social network | Muted words, labelers, custom feeds, starter packs, reply gates |
| `convex-checkpoints-main` | Convex component for milestone rules | Counting progress from outside sources over HTTP |
| `convex-credits-main` | Convex component for credit ledgers | Gifting, transfers, reserve and release |
| `convex-slack-main`, `convex-telegram-main`, `convex-whatsapp-main` | Convex components for messaging channels | Messages only one person sees, App Home, read receipts, buttons |
| `native-cook-main` | Catalog of 799 mobile UI blocks | Sensory primitives: fluids, clay, sound, reveals |
| `expo-ui-examples-main`, `expo-animated-streaming-text-main` | Native UI and streaming-text demos | Co-presence orbs, replies streamed at a chosen pace |
| `xolace-quote screen-redesign` | Xolace's own quote playground | Themed atmospheres, poster export |
| `companion-main`, `private-mind-main`, `rakazo-main` | Already studied in [`sample-apps/`](sample-apps/README.md) | A second pass, see below |

The second pass over Companion, Private Mind and Rakazo found mechanics the first one
missed:

| Repo | Newly found |
|---|---|
| Rakazo | Teaching a skill by demonstration, sandboxed generated tools, agent-to-agent links, group handoffs |
| Companion | Calendar limits, out-of-office (OOO) with a handover |
| Private Mind | A sources library, language detection |

It also took a bolder look at things the first pass had skipped.

### What the baseline already has

Each idea below was checked against this list so we don't propose what exists. The
redesign and production already have:

**Core flows:**
- Today
- Reflect with the AI mirror: tones, "Not quite", read aloud
- Vent: particles, burn
- Talk: Ember, the LiveKit voice companion
- Sit: breathing, plus the exercise catalog
- Kindling: twigs, plus a catalog of offline actions to try

**Follow-up and reaching out:**
- Follow-ups and the outreach layer
- Telegram: check-ins with AI replies
- Quiet hours

**Progress and keepsakes:**
- Streaks, freezes, revives, sparks and badges
- Steadiness: a 0–100 score with "where relief came from"
- Moments
- Daily quote poster

**Library and audio:**
- Explore, with a licensed music and support library of about 440 tracks
- Lantern reader, with narration

**People:**
- Xolacers: 1:1 peer chat
- Camp channel
- Peer reflections
- Campfire cohort count
- Letters (redesign only)
- Trusted Bridge

**Care and onboarding:**
- Care: crisis lines (Ghana)
- Intake with Flux
- Xolace+

**Gaps that matter for this doc:**
- No sound or music generation; text-to-speech only.
- No tools users can make themselves.
- No health or wearable data.
- No widgets or Live Activities.
- No group spaces.
- B2B, plugin and MCP exist only as research. The CLI is auth plus a shell.

## TL;DR: the twelve big bets

These rank highest for fit times novelty. Each links to its full entry. The tags here
are the ones that survived the [market check](#market-check-of-the-big-bets).

1. **[Sound of Right Now](#sound-of-right-now) + [Iso Journey](#iso-journey).** Say how you
   feel and get a looping soundscape or song generated on the spot, then an arc of
   sounds that moves you, step by step, toward where you want to be. This is the
   founders' "make the music you need right now" idea, and Endlessly already shows how
   the generation pipeline works. `RARE` (Moodusic and MuseAI generate music from a
   mood, outside any support loop) / `NEW` (no consumer app runs a generated iso arc)
2. **[Inner Forecast](#inner-forecast).** Xolace forecasts tonight or tomorrow as inner
   weather. Its confidence rests on how much data it has, not on how dramatic the
   forecast is, and it offers support before the heavy hours arrive. `RARE`
   (Tranquilo, MoodQuad and Emotion Tracker already forecast mood)
3. **[Teach Xolace your thing](#teach-xolace-your-thing).** Users turn their own small
   rituals (a shower playlist, a walk route, texting a sister) into tools Xolace can
   offer at the right moment. `NEW`
4. **[If-this-then-care](#if-this-then-care).** Users write care rules in their own words,
   for example "when I answer heavier after 10pm, send my sister a heart on Telegram,
   never the reason". `NEW`
5. **[Next small step chips](#next-small-step-chips).** Every mirror and follow-up ends in
   0–3 one-tap real-world actions chosen from a fixed list: text Sam, put a walk on the
   calendar, open the nearest park. `RARE` (Mentavo and Calmplot suggest a next step,
   but not as deep-linked actions)
6. **[Rehearsal Room](#rehearsal-room).** Rehearse the conversation you dread, out loud,
   before it happens; a follow-up afterwards compares how it went with how you expected
   it to go. Rehearsal alone is now `COMMON` (TalkSimulator, Boundary Trainer, Yoodli);
   the loop with a follow-up after the real conversation is `NEW`.
7. **[Support kits](#support-kits).** A shareable bundle of what helps me (a sound, a Sit,
   a ritual, a read). A friend who opens it gets a Xolace set up the same way, so it
   also brings in new users. `NEW`
8. **[Voice Weather](#voice-weather).** With opt-in, Xolace watches pace, pauses and
   flatness against your own baseline, and speaks first when your voice drifts. `RARE`
   (Sonde Mental Fitness does this for consumers; Kintsugi closed in February 2026 and
   published its models)
9. **[Lock-screen presence](#lock-screen-presence).** An "I'm here" Live Activity after a
   session that ended unresolved, a "Sit with me" Action button that can't fail, and a
   Live Activity that rides a panic wave with you. Breathing Live Activities and an
   Action-button panic tool are `RARE` (Sym Breathing, Rootd, Panic Exit); the "I'm
   here" presence that hands off to a follow-up is `NEW`.
10. **[Between Turns](#between-turns).** The time spent waiting on an AI coding agent
    becomes recovery time. This is wellbeing for people who supervise agents all day.
    `RARE` (BreakingGap is a small open-source break skill for Claude Code and Codex)
11. **[Gifted care](#gifted-care).** Gift sparks, a hard-week Plus pass, or a share of a
    pay-it-forward pool to someone who's struggling. Care becomes a gift with real value.
    Sponsored and gifted subscriptions are `RARE` (Bearable Heroes, Rootd sponsors);
    gifting earned sparks alongside an anonymous letter is `NEW`.
12. **[Proactivity dial](#proactivity-dial).** Supervised, Auto or Free: the user chooses
    how freely Xolace may speak first. An employer can lower the cap but never raise it.
    `NEW`

Two more ideas are cheap and should be adopted almost regardless of the rest:

- **[Waiting is breathing](#waiting-is-breathing).** Every time Xolace is generating
  something, the wait becomes a short guided breath instead of a spinner.
- The **[design principles](#principles-worth-adopting-now)** harvested from these repos,
  which apply to everything else in this doc.

---

## A. Speaking first: forecasting and sensing

### Strongest fit

<a id="inner-forecast"></a>
**Inner Forecast** `RARE` (Tranquilo calls itself "your weather app for mood"; MoodQuad
and Emotion Tracker forecast mood days ahead) · mobile, widget, channel, watch.
What's still ours: confidence based on evidence quality, and offering shelter before
the heavy hours instead of only predicting them.
Xolace forecasts likely heavy days and evenings from patterns it already has: follow-up
answers, the hours you show up, sessions, anniversaries, season and, later, sleep and
calendar. It shows them on Today as weather bands ("the evening may run heavy") and
offers shelter ahead of time: a Sit at 6pm, a letter to read, a sound. Three rules
borrowed from Oddswell keep it honest:
- **Code computes the forecast; the AI only words it.**
- **Confidence measures evidence quality**, for example "thin data: 6 days of check-ins".
- **At most four risk flags, in plain words.**

On a heavy day the alert sits behind frost that you wipe away. Variants from other
repos:
- a personal "season outlook" (exam weeks, the anniversary month);
- a **rhythm map**, so outreach lands just before your usual rough hour rather than at a
  fixed 9am.

*From* oddswell (`utils/futbolConfidence.ts`, `utils/futbolRiskFlags.ts`), native-cook
(`cards/daypart-weather-bands`, `modals/frost-wipe-alert`), oyelo (listening heatmap and
peak hours, `Core/UsageStore.swift`).

<a id="voice-weather"></a>
**Voice Weather** `RARE` (Sonde Mental Fitness is a consumer voice-journal app that
detects stress; Kintsugi shut down in February 2026 and published its depression-voice
models on Hugging Face, which may be usable: check the licence) · mobile, channel.
With opt-in, every spoken Reflect, Talk, Vent or Telegram voice note records features
that are not a diagnosis: pace, pauses, flatness and hesitation. Xolace compares them
with your own rolling baseline. When the drift holds across several entries, Flux checks
in first: "you've sounded a bit heavier this week". It never diagnoses, and it shows the
same "because" evidence as every other insight.
*From* clarity (`services/alignment.ts`, `lib/score.ts`, prosody flags in
`services/assessment-mapping.ts`).

<a id="things-to-look-forward-to"></a>
**Things to look forward to** `NEW` · mobile, channel, desktop.
A calendar of things you're anticipating: an album drop, a friend's visit, payday, a
game launch. Xolace reaches out with a hopeful reason ("3 days until…") instead of only
checking up. Anticipation is used as prevention, borrowing from behavioural activation.
*From* Medley (Upcoming tab, `lib/upcoming-sections.ts`).

**Real-life checkpoints** `NEW` · watch, dev-plugin, cli, b2b.
Other systems report small acts of self-care to Xolace, and they count toward showing
up:
- a walk logged in Apple Health
- a Strava run
- lights out by 11 on a smart lamp
- a break logged from the terminal

Signals can also travel the other way, with the user's consent. A language app, fitness
app or bank that notices someone dropping off can hand them to Xolace: a "proactive
signal API" for other products. This builds on the inbound-webhook idea in
[`sample-apps/features.md`](sample-apps/features.md#connectors-what-xolace-can-see-and-do-outside-itself).
*From* convex-checkpoints (HTTP factor routes in `src/client/index.ts`), t3code (webhook
automations), rakazo.

**Read-aware gentleness** `NEW` · channel.
Delivery status shapes the next outreach:
- *Read but not answered:* back off.
- *Delivered but unread for 3 days:* switch channel, or send a softer "no need to reply".

This feeds the outreach layer's choice of intent.
*From* convex-whatsapp (`queued → sent → delivered → read` in `src/component/`).

### Nice to have

- **Your body, when you ask** `RARE` (an HRV-triggered check-in is `NEW`) · mobile,
  watch. Import sleep, HRV and cycle data on request only. Never overwrite what the user
  entered by hand, and never pass it to the AI without consent. A sustained dip can start
  a gentle check-in. *From* Mora (`src/features/health/import.ios.ts`).
- **Inner Barometer** `NEW` · watch, widget. A needle driven by HRV or sleep that drifts
  toward "Change". Xolace speaks first when it crosses a threshold. *From* native-cook
  (`charts/barometer-needle-chart`).
- **Withdrawal radar** `NEW` · mobile, b2b. A run of cancelled plans and declined
  invites in the calendar is an early sign of withdrawal. Xolace sends one gentle note,
  or stays silent. *From* companion (no-shows, cancellations).
- **Three lenses** `NEW` · mobile. Puts side by side what you *said*, what your *body
  data* shows and what your *history* suggests. When they disagree, Xolace mentions it
  gently ("you say fine; you've slept 5h four nights"). *From* oddswell (the market vs
  model vs blend table).
- **Flux calls you** `RARE` (some AI companions call) · mobile. A proactive Talk arrives
  as an incoming call, a handset swinging on its cord. Lift it to answer, or let it ring
  out with no guilt. *From* native-cook (`gestures/slide-to-answer-cord`).
- **Gentle bell** `RARE` · mobile, channel. A soft ping when a chosen friend shows up
  ("Sam checked in today"). The friend controls who may subscribe. *From* Bluesky
  (activity subscriptions).

### Lowest fit

- **Post-meeting debrief** `NEW` · desktop, b2b. With consent, Xolace reads a stressful
  meeting's transcript and offers a reframe. It handles a lot of private data from third
  parties. *From* companion (recordings and transcripts).

---

## B. Dynamic, user-made support

### Strongest fit

<a id="sound-of-right-now"></a>
**Sound of Right Now** `RARE` (Moodusic and MuseAI's "MoodSync" generate music from a
typed mood as general creative apps; Mubert sells a text-to-music API to digital
therapeutics; Endel adapts soundscapes but doesn't take your words) · mobile, desktop,
web, cli.
What's still ours: generation inside a support loop, lyrics from your own words, and
sounds you keep and can gift.
You say or type how you feel, or "the place I wish I were". Xolace writes **one**
blended, loopable atmosphere ("blend, don't list") and generates it in seconds, as a
soundscape now and, later, a song. Pieces from the repos:
- **Layered prompt.** Tempo, instruments, place and mood are separate layers, so you
  can tweak one without changing the rest.
- **Start sooner.** The first section starts playing while the rest renders.
- **Price before generating.** A sheet shows the spark cost first, and sparks are
  refunded if generation fails or "this didn't help".
- **Lyrics from your own words.** If it's a song, the lyrics come from your words and
  highlight as it plays.
- **Yours to keep.** You can save it to Lantern or as a keepsake, and play it under
  Sit, Vent or Reflect.

*From* endlessly (`hono/src/routes/text-to-sound-effects.ts`, Stable Audio 2.5 and
ElevenLabs `loop: true`), Inkigo (`lib/prompts/build-layered-prompt.ts`, prompt
improver), oyelo (generating in sections, `GenerationReviewView.swift`,
`PlayerLyricsView.swift`), convex-credits (reserve, then complete or release).

<a id="iso-journey"></a>
**Iso Journey** `NEW` as a product · mobile, watch.
Music therapy's iso principle, made on the spot. The method itself is being tested in
trials of personalised iso playlists (for example NCT07055061), which is evidence in
its favour; no consumer app was found that generates the arc. The first sound matches where you are
(agitated, heavy). Each following loop crossfades one step toward calm, or toward
energy. A 3–5 chapter arc of sound; heart rate could set the pace later.
*From* endlessly (a different ambient loop per chapter, `hooks/useAmbientAudio.ts`).

**Pluck your feeling and Spatial Shelter** `NEW` · mobile, web, desktop.
Two ways to make your own sound.
- **Pluck your feeling.** Pluck strings or chimes to play your own feeling. Xolace
  harmonizes it into a 60-second piece that is saved to Lantern as yours.
- **Spatial Shelter.** Drag sound sources around your head in spatial audio until it
  feels like shelter: rain, fire, birds, a friend's recorded voice. Save it as a place
  to come back to.

*From* native-cook (`playground/pluck-string-harp`, `pickers/wind-chime-tones`,
`media/spatial-orbit-mixer`; about 60 blocks already synthesize their own sound).

<a id="teach-xolace-your-thing"></a>
**Teach Xolace your thing** `NEW` · mobile, web.
You show or tell Xolace the small thing that works for you: the shower playlist, a walk
route, the "text my sister" move. It becomes a playbook with:
- when to use it;
- the steps;
- how to tell it worked;
- a boundary.

Xolace can then offer it at the right moment, as a twig or in a follow-up. Two
companions to it:
- **Saved rituals** group several actions into one tap ("Sunday reset: tea + walk + call
  mum").
- **Pattern → ritual.** After you do the same thing three times in the same situation, Xolace
  asks whether to make it a ritual.

*From* rakazo (`packages/core/src/teach-playbook.ts`), Mora (meal builder,
`src/screens/meal-builder-screen.tsx`), Expensify (`MerchantRuleSuggestion.ts`).

<a id="if-this-then-care"></a>
**If-this-then-care** `NEW` · mobile, channel.
Care rules in your own words, built by Flux, that trigger on Xolace's own events (an
answer, a broken streak, a letter acknowledged). For example:
- "When I answer heavier after 10pm, send my sister a heart on Telegram, never the
  reason."
- "If I skip Sit three days, offer a walk, not a lecture."
- "Text my sister 3 times this week": a micro-goal you set yourself, and Xolace
  celebrates when you reach it.

Every rule is visible and editable, and any change Xolace makes to it is logged where
you can see it. Safety note from the market check: crisis-feature design guidance says
apps should not contact people on the user's behalf without the user confirming in the
moment, so a rule that messages another person should ask first by default. Personal care agents with names and templates ("Sunday Steward", "Payday
Calm") are the same idea in a friendlier form. This builds on the "user-authored
routines" idea in the earlier study.
*From* Expensify (agent rules and plain-language triggers, `src/libs/actions/Agent.ts`),
convex-checkpoints (`registerRule`).

**Generative micro-tools** `NEW` · mobile, web, desktop.
The companion builds a small interactive tool for this moment and runs it in a sandbox
with no network access. Examples:
- a two-option decision board
- a worry jar you drag worries into
- a grounding game built from things in your room
- a breathing visual paced to your own words

You can keep a tool, and kept tools become part of your kit. This is the most literal
version of "support that's made on the spot".
*From* rakazo (`packages/core/src/artifact-sandbox.ts`, sandboxed WebView with CSP),
t3code (HTML visual replies).

**Comfort Shelf and living toolkits** `RARE` (a "hope box" exists in some apps, but
nothing files it with AI or brings it back on its own) · mobile, web, channel.
- **Comfort Shelf.** Share anything into Xolace from any app: a meme, a friend's voice
  note, a photo of your dog, a song. The AI tags it by the feeling it helps with, and
  Xolace brings it back in a follow-up when that feeling shows up ("you saved this in
  March; still works?").
- **Living toolkits.** You name a space ("Before exams", "Sunday dread") and Xolace keeps
  suggesting things for it from your past sessions, keepsakes and Lantern.
- **Who decides.** The AI only ever writes *suggested* items. It can never undo
  something you saved or dismissed.

*From* amber (share intake, `convex/spaces.ts`; spaceItems are
suggested/saved/dismissed).

### Nice to have

- **Your Story, Retold** `NEW` · mobile, web. After a session, Xolace turns your
  situation into a 3–5 chapter fable, with art, narration, ambient sound and a value
  lens (rest, courage, self-compassion). The closing line becomes a keepsake. This draws
  on narrative therapy and bibliotherapy. *From* endlessly (strict story schema with
  `visual_baseline`, `constants/moral.ts`).
- **Tonight's Story** `RARE` (Calm's sleep stories are generic) · mobile, channel. A
  wind-down story made from your own day's good moments. It can arrive as a Telegram
  voice note at bedtime. *From* endlessly.
- **Nightmare rewrite studio** `NEW` · mobile. Based on imagery rehearsal therapy. You
  describe a recurring nightmare and write a new ending. Xolace renders the rewritten
  scene as an image and a soundscape for you to rehearse at bedtime, and a follow-up
  checks on you the next morning. It has a strong evidence base but serves a narrow
  group. *From* Inkigo (image edit and remove modes, `lib/prompts/build-image-edit.ts`).
- **Try on a future day** `NEW` · mobile, desktop. Before a big decision, hear an audio
  postcard of a day down each path, so you notice how each one *feels*. *From* Inkigo
  (try-on).
- **Safe-place try-on** `NEW` · mobile. A generated calm place built from your own
  memories ("grandma's kitchen, rain"), used as a grounding image during Sit. *From*
  Inkigo (combining two images).
- **Reframe passage, read aloud** `NEW` · mobile. Your own heavy phrases are rewritten
  kindly, and you read them aloud on a teleprompter that tracks your voice. Saying it
  yourself is the intervention. *From* clarity ("Practice all",
  `convex/passagePrompt.ts`, `components/session/teleprompter.tsx`).
- **Week in Panels** `NEW` · mobile, web. A comic strip of your week, with your abstract
  avatar and Flux drawn the same way in every panel. *From* endlessly (consistent
  characters across images).
- **Keepsake art from your words.** Three ways to turn a reflection into art:
  - **Atmosphere from your reply** `NEW`: the quote screen's background and sound are
    generated from what *you* wrote back.
  - **Kaleidoscope keepsake** `NEW`: today's words folded into a mandala.
  - **Marbled week** `NEW`: each session drops a colour, and on Sunday you comb them into
    one sheet.

  *From* `xolace-quote screen-redesign` (`main-themes.js`, `quote-export.js`) and
  native-cook (`playground/kaleidoscope-twist`, `playground/marbling-comb`).
- **Ask-your-data charts** `RARE` · mobile, web. "Show me my sleep against my heavy
  days", drawn on the spot from a safe declarative spec. *From* rakazo
  (`packages/core/src/plot/plot-spec.ts`).

### Lowest fit

- **Your-own-voice affirmations** `NEW` · mobile. Clone the user's voice so affirmations,
  or a message from your future self, play in it. Research supports the effect of
  hearing yourself, but voice cloning carries deepfake and consent risk. *From* rakazo
  (voice providers that support cloning).
- **Comfort kit with real things** `NEW` · mobile. A photo of your ideal cozy evening is
  turned into items you can buy, with spending guardrails. This puts the product close to
  commerce. *From* amber (product finder).

---

## C. Real life: the small things people actually do

### Strongest fit

<a id="next-small-step-chips"></a>
**Next small step chips** `RARE` (Mentavo proposes a next-step card you tap to
create; Calmplot offers one tiny next step; neither deep-links into messages, calls,
maps or the calendar) · mobile, channel.
Every mirror, Kindling path or follow-up answer ends with 0–3 deep-linked actions taken
from a **fixed list**: message, call, add a calendar event, open maps, open a link.
Examples:
- "Text Sam"
- "Put a 10-min walk on the calendar"
- "Open the nearest park"
- "Call your Trusted Bridge"

The chips change with context: the same reflection gives different chips under "Sleep"
than under "Work". Because the list is fixed, the AI can't invent an action.
*From* amber (`INTENT_KINDS` and space-steered intents in `convex/ai.ts`).

<a id="rehearsal-room"></a>
**Rehearsal Room, with a pre-game and post-game** · mobile, web, desktop, b2b.
Rehearsal alone is `COMMON` now: TalkSimulator, Boundary Trainer AI, Yoodli, Prehearse
and Assertr all do AI role-play. The loop (pre-game, the real conversation, then a
follow-up comparing what happened with what you expected) is `NEW`. An App Store app
is already called "Rehearsal Room AI", so this needs another name.
Before a hard conversation (a raise, a boundary, telling a friend you're struggling),
Xolace sets up a "matchup":
- your strengths and the other person's likely moves;
- how it might go;
- a plan B.

You rehearse out loud, either with a script on the tracking teleprompter or freestyle
against a role-play that has three difficulty levels. Feedback is about steadiness
(pace, pauses, hedging), never performance. After the real conversation, a follow-up
asks how it went and compares that with what you expected. A 60-second desktop version
("Pre-meeting Steady") is a natural B2B wedge.
*From* oddswell (matchup form → result tabs), Inkigo ("try on before you commit"),
clarity (teleprompter, evidence-cited coach in `convex/coachPrompt.ts`).

**Coping receipts and a joy ledger** `RARE` · mobile, channel.
Log the small things that helped as easily as Mora logs food: showered, stepped outside,
texted a friend. You can say it in a sentence or photograph a ticket stub. Xolace drafts
cards and you confirm them. Over time they become a personal "what works for me" library
that feeds sparks and Steadiness's "where relief came from". A weekly **showing-up
receipt** prints them with a thermal-printer feel; the CLI prints it in ASCII.
*From* Mora (draft → confirm, `src/features/chat/draft-store.ts`), Expensify (receipt
scanning), native-cook (`gestures/receipt-printer`).

**Overwhelm decoder** `NEW` · mobile, channel, web.
Forward or share a scary email, medical letter, landlord notice or harsh review. Xolace
rewrites it calm and plain:
- what it actually asks;
- what can wait;
- one next step.

It's read aloud slowly, and the original is one tap away. On Telegram it's as simple as
"forward it to the bot".
*From* oyelo (narration preparation, `Core/NarrationPreparation.swift`).

**Go-outside prescriptions** `NEW` · mobile, channel.
Small plans based on where you are and the time: "a matinee starts 1.2 km away in 40
min", "the park is in sun until 5". These are real, local ways to help yourself.
*From* Medley (showtimes proxy, `supabase/functions/showtimes`).

**Mindful kettle** `NEW` · mobile, watch.
Xolace keeps you company through a real-life ritual instead of replacing it. Making tea
gets a kettle-boil progress bar; lighting a candle gets a burn-down timer; letting bread
rise gets its own. The app accompanies the act, and the act counts as showing up.
*From* native-cook (`progress/kettle-boil-progress`, `progress/candle-burn-timer`,
`progress/sand-hourglass`).

### Nice to have

- **Comfort media diary** `NEW` · mobile, web. The shows, games, books and songs that
  held you. On heavy days Xolace offers "your comfort rewatch, S3E4, 22 min left" with
  where to watch it. *From* Medley.
- **Worry shelf** `NEW` · mobile, web. Worries become threads you can pin, or snooze until
  your "worry window" (the CBT worry-time technique, made literal). A worry auto-settles
  after 7 quiet days, can always be woken, and every state has a way back. *From* t3code
  (`docs/user/thread-sidebar.md`).
- **Worry deck** `NEW` · mobile. Worries pulled from your reflections arrive as cards to
  swipe: left to release (with the Vent particles), up for "work on it", right for "still
  holding". *From* amber (Tidy swipe deck, `src/lib/tidy/*`).
- **Spoon budget** `RARE` · mobile, desktop. A daily social and energy capacity. Unused
  capacity partly rolls over, and Xolace warns you early when the calendar is overbooked
  for your recent capacity. *From* Mora (rollover budget, `src/utils/tracking.ts`).
- **Recovery buffers and "I need a day"** `NEW` · web, mobile, b2b. Xolace proposes
  calendar boundaries for you to approve: a 15-minute buffer after a meeting it expects
  to be hard, or a cap on meetings during a heavy week. "I need a day" sets an
  out-of-office across calendar, Slack and email in one tap. *From* companion (booking
  limits in `LimitsTab.tsx`, out-of-office with a redirect).
- **Capture the moment that stung** `NEW` · mobile, desktop. Screenshot or share a
  painful text, or press a global shortcut on desktop to grab the window that upset you.
  Reflect opens with it as context, and an optional reply draft can wait overnight before
  you send it. *From* amber (Siri on-screen capture), t3code (SnapShots), Inkigo (share
  into the app).
- **"Show me" grounding** `NEW` · mobile. Snap your room and Xolace runs 5-4-3-2-1
  grounding using objects actually in the photo. Snap a messy desk and it picks one
  2-minute task and stays with you (body doubling). Runs on the server, so phone memory
  isn't a limit. *From* private-mind (vision models), rakazo (image memory).
- **Pause before Send** `RARE` · web (browser extension), desktop. A Xolace button next to
  Send in Gmail or Slack. For a heated draft it offers a 60-second cool-down, a reframe,
  or "send tomorrow 9am". *From* companion (`apps/extension/entrypoints/content.ts`).
- **Ask-for-help link** `NEW` · mobile, channel. A one-time link you send a friend: "pick
  a 20-minute walk with me this week" or "check on me Friday". Asking becomes one tap.
  *From* companion (private links).
- **Walk it off** `RARE` · mobile, watch. A walk detected in the background after a
  heavier answer counts as showing up, with nothing to log. *From* Expensify (GPS
  distance tracking).

### Lowest fit

- **Life-admin relief** `NEW` · desktop, web. A sandboxed browser does the admin that
  feeds anxiety: cancel the subscription, rebook the GP. You take over for 2FA and
  approve every send. It helps a lot but carries a large security surface. *From* rakazo
  (computers, `request_takeover`, approvals).
- **Memory-lane photo swipe** `NEW` · mobile. Deals 10 old photos a week: keep one as a
  joy keepsake, let one go. It wanders into photo-library cleanup. *From* amber (Tidy).

---

## D. Human connection

### Strongest fit

<a id="support-kits"></a>
**Support kits** `NEW` · mobile, web, b2b.
A shareable bundle of "what helps me": three practices, a Sit pattern, a Lantern read,
a sound I generated, a ritual. It comes with a share card and a QR code. A friend who
opens it gets a Xolace pre-set the same way, which also makes it an acquisition loop.
Variants:
- ranked "what got me through my first month after the move" lists;
- kits published anonymously to the peer pool that others can install and adapt.

The public versions need moderation and a safety check before anything goes out.
Therapists and organizations can hand kits out too.
*From* Bluesky (starter packs, `src/screens/StarterPack/Wizard/`, `bskyogcard/`), Medley
(mixed ranked collections), rakazo (user-authored SKILL.md recipes).

<a id="kit-commons"></a>
**Kit Commons: where kits live** `NEW` (unchecked) · mobile, web, b2b.
Proposed by the founders on 2026-11-16 as how support kits grow. A free place, not a
shop, to browse kits and install them. "Commons" is a working name; avoid
"marketplace", which sounds like buying.

- **Kits Xolace understands.** A kit holds two kinds of item:
  - **Xolace items:** a Sit pattern, a generated sound, a Lantern piece, a care-rule
    template, or a ritual in the [Teach Xolace your thing](#teach-xolace-your-thing)
    format (when to use it, the steps, how to tell it worked). Installing a kit puts
    these into the user's toolkit, so Xolace can offer them at the right moment, in a
    follow-up or a Kindling twig.
  - **Plain items:** "call someone", a song link, "go outside". These stay as cards.

  A fixed set of item types keeps moderation manageable.
- **Count help, not just installs.** Show "1,240 installed · 380 said it helped". The
  second number comes from follow-up answers of "lighter" after using the kit. For the
  creator, "your kit helped 380 people this month" is the reward: it counts
  contributing, never struggling.
- **Browse by need, not by rank.** Group kits by what someone is going through: before
  exams, after a breakup, can't sleep, Sunday dread. Order them by fit to this person,
  not raw installs, so it never becomes a leaderboard. Xolace can bring a kit up itself:
  "a kit 300 people used for exam nights; want it?"
- **Installing makes your own copy.** Users can change their copy. When the creator
  updates a kit, users choose whether to take the update; it never changes silently.
- **Creators choose how they appear.** At publish time the creator picks *anonymous* or
  *under my account* (name and avatar), and can change it later.
- **Always tied to the account behind the scenes.** Unlike peer reflections, which keep
  only an HMAC author tag (ADR 0002), a published kit always links to its creator's user
  record. Even an anonymous kit is linked, which allows:
  - editing and versioning by the creator;
  - takedowns and moderation;
  - "helped" stats sent back to the creator.

  The publish screen must say this plainly: "shown as anonymous, but Xolace knows it's
  yours". Deleting an account needs a rule for its published kits: remove them, or keep
  them with the creator detached.
- **Three tiers:** Xolace's own official kits, kits from vetted partners (therapists,
  NGOs, campus counselling, see [Trusted listeners](#d-human-connection)), and community
  kits.
- **Risks to design for:**
  - Unsafe advice inside a kit (fasting, stopping medication, anything near self-harm).
    Every kit gets a safety check before it's published, plus reporting, with human
    review for featured kits.
  - Near-copies and low-effort spam.
  - Named creators being contacted or harassed through their kits. Named display should
    not open a way to message the creator.

**Letters with a body** `NEW` · mobile, channel.
Extends Letters (redesign) in four ways:
- **Warm letters.** A letter arrives in thermochromic ink and only shows while your thumb
  rests on it. Reading it becomes presence.
- **Letters you can hear.** The recipient chooses a warm voice to play it in, never the
  sender's, which keeps it anonymous. A sender can attach a generated soundscape: "a
  letter with weather in it".
- **Letters across languages.** A letter written in Twi arrives in Spanish, with "show
  original" one tap away, so a stranger in São Paulo can comfort someone in Accra.
- **Stamp book.** Every letter received becomes a postmarked stamp in a diary calendar,
  and acknowledging a letter cancels its stamp.

*From* native-cook (`cards/thermal-reveal-card`, `pickers/stamp-diary-calendar`,
`cards/postcard-stamp-cancel`), endlessly (voice catalogue), oyelo (translate before
generating), Expensify (`ReceiptTranslation.ts`).

**Witness links** `NEW` · web, mobile.
Share one Reflect thread with one trusted person through a 24-hour link that needs no
account. They can read along and write back. Nothing they write enters your space until
you tap Send or Dismiss. A softer, more controlled Trusted Bridge.
*From* t3code (`docs/user/guest-links.md`).

**Care rota / support circle** `NEW` · channel, mobile.
When friends are supporting someone through a hard week, Xolace (when invited into the
group's WhatsApp, Telegram or iMessage chat) helps organize the care:
- splits check-ins ("you take Tuesday");
- tracks who's bringing food;
- nudges the group when nobody has messaged the person in three days.

A lighter version is a weekly rose/thorn ritual for a friend group.
*From* Expensify (split expenses), rakazo (taking part in iMessage group chats),
convex-telegram.

<a id="gifted-care"></a>
**Gifted care** · mobile, web, b2b.
Sponsored and gifted subscriptions are `RARE`: Bearable Heroes funds subscriptions for
people who can't pay, Rootd and ShareWell take sponsors, and Calmerry and BetterHelp
sell gift codes. Gifting *earned* sparks, alongside an anonymous letter, is `NEW`.
- **Gift sparks** to a friend, or anonymously alongside a letter. They spend them on a
  streak freeze or a Plus feature.
- **A hard-week pass.** A 7-day Plus pass bought when life spikes, or gifted.
- **A pay-it-forward campfire pool.** Users and companies give into a shared pool that
  unlocks Plus channels and Talk minutes for people who can't pay, with a public,
  anonymous ledger of "warmth given".

*From* convex-credits (transfer and namespaces), Inkigo (credit packs alongside
subscriptions, `plans/credit-pack-monetization/`), oyelo (tip jar), Expensify (Karma /
TeachersUnite).

**Sitting together** `NEW` · mobile, desktop.
Anonymous co-presence with no chat. Your glass orb drifts toward the orbs of others who
are sitting right now and merges with them: "three Xolacers are sitting with you". This
extends the campfire count into the present moment.
*From* expo-ui-examples (`liquid-glass`), Bluesky ("Live now").

### Nice to have

- **Companion-to-companion** `NEW` · mobile, channel. With both people's approval, my
  Xolace can pass "rough week, go easy" to my partner's Xolace. A hop limit stops the
  companions passing messages back and forth forever. *From* rakazo
  (`packages/adapters/src/agent-connections.ts`).
- **Raise the flag** `NEW` · mobile, watch. A wordless request to your Trusted Bridge:
  pull a cloth flag up its pole, and your person sees it raised. A Slack version is a
  private emoji reaction that pings them quietly. *From* native-cook
  (`playground/cloth-flag-mesh`), convex-slack (reaction events).
- **Care copilot** `RARE` · mobile. A trusted person gets a limited role: they can see
  *whether* you checked in, never what you said, and can send a nudge. Either of you can
  revoke it. *From* Expensify (delegates, `Delegate.ts`).
- **Trusted listeners** `NEW` · mobile, admin, b2b. Organizations Xolace trusts (NGOs,
  campus counselling) vouch for individual Xolacers. A badge shows who vouched. *From*
  Bluesky (trusted verifiers).
- **Care labelers and support feeds** `NEW` · mobile, web, b2b. Community or clinician
  groups run "labelers" (for example ED-recovery: "numbers"; a grief circle:
  "loss-adjacent"), and users choose to show, soften or hide each label. Lantern and the
  peer pool become feeds partners can write for, scored on "felt lighter afterwards",
  never time spent. *From* Bluesky (labelers, custom feeds, `src/state/feed-feedback.tsx`).
- **Kindred swipe** `RARE` · mobile. Swipe through peer reflections and tap "me too".
  When two people resonate with each other, an opt-in chat can open. *From* Medley (Match
  deck).
- **Flux whispers** `NEW` · mobile. In a Xolacer chat, Flux leaves a note only you can
  see ("want a breath before sending?"). *From* Expensify (whispers).
- **New-here halo** `NEW` · mobile. First-week users are marked "new here, be gentle" in
  community spaces. *From* Bluesky (Newskie).
- **Matching keepsakes** `NEW` · mobile. Two people who got through something together
  co-create a symbol they each keep. *From* Inkigo.
- **Rubbing peer reflections** `NEW` · mobile. A peer reflection is hidden as a relief
  under paper; scrub with a crayon until "someone felt this too" appears. *From*
  native-cook (`cards/crayon-rubbing-card`).
- **Lockable circles and reply gates** `RARE` · mobile, web. Small support groups you
  join by request. They can be locked into a "remembrance" state when they end. When you
  share something vulnerable, you choose who may reply. This needs group spaces, which
  Xolace doesn't have yet. *From* Bluesky (group chat lock, threadgate).

### Lowest fit

- **Wellbeing on the AT Protocol** `NEW` · web, dev-plugin. Make keepsakes, reflections
  and achievements portable records the user owns on Bluesky's AT Protocol, and show
  friends' wellbeing moments from other apps. It is a strategic bet more than a feature.
  *From* Bluesky (Atmosphere).

---

## E. Sensory and expressive moments

These extend Vent, Sit, Reflect and Steadiness, and native-cook already has the
building blocks for each.

### Strongest fit

<a id="waiting-is-breathing"></a>
**Waiting is breathing** `NEW` · mobile, desktop, cli.
Every AI wait (the mirror, generation, Talk connecting) pulses haptics and the screen at
a breathing pace, with "I'm composing, breathe with me". Each generation becomes a
10-second Sit. It's the cheapest idea in this doc.
*From* oddswell (`hooks/useLoadingHaptics.ts`), endlessly (staged progress screen).

**Release rituals** `NEW` (choosing among them is `RARE`) · mobile, web.
More ways to let go in Vent:
- **Pour it out.** Each phrase falls as ink into water. Stir it, then press to clear the
  water.
- **Shatter & mend.** Break a harsh thought on glass, then swipe back to reassemble it
  as the mirror's kinder reframe. The block's own "break / mend" gesture becomes the
  reframe.
- **Let it drift.** The transcript blows away like leaves, and a reverse swipe keeps
  the one line you want.
- **Your choice.** Pick your own: crumple, tear, burn (a match strike that only lights
  if you swipe fast enough), pop.

*From* native-cook (`animations/ink-drop-bloom`, `animations/shatter-glass-transition`,
`text/wind-scatter-letters`, `buttons/matchstick-strike-button`).

**Wordless body check-ins** `NEW` · mobile.
- **Tension clay.** Press clay where and how hard the tension feels. It keeps the dents,
  and it visibly relaxes after a Sit.
- **Felt-sense.** Spikes of ferrofluid rise under your finger and melt as your breathing
  slows.
- **Where it sits.** Tap where the feeling sits on a body map (jaw, chest, stomach) to
  get a matching body-based reset.

These reach people who can't name what they feel.
*From* native-cook (`playground/clay-press-blob`, `playground/ferrofluid-blob`), Inkigo
(25+ body placements).

**Feeling field** `RARE` (How We Feel uses a grid, not a field the word morphs across) ·
mobile, watch.
A continuous 2D field replaces mood buttons. As you drag, the word morphs, so you can
land between "tired" and "tender". Paired with **Words you reached for**
([section F](#f-insight-and-memory-you-can-trust)), it grows emotional vocabulary.
*From* native-cook (`pickers/magnetic-feeling-field`).

**Pace-and-lead Flux** `NEW` · mobile, desktop.
In Vent or Talk, Flux's breathing and the AI voice first match how fast you're speaking,
then slow down a little at a time. The technique is "pacing and leading" from hypnotherapy
and music therapy. The live words-per-minute reading becomes "you're slowing down", never a
score. **Tap your rhythm** is the version for when words won't come: tap how fast it feels
inside on a telegraph key, and Flux mirrors the rhythm and then leads it down.
*From* clarity (live WPM), native-cook (`inputs/morse-key-input`).

**Progress that can't shame** `NEW` · mobile, widget.
- **Tree rings.** Lifetime days you showed up drawn as rings; gaps make thin rings,
  never broken ones.
- **Seasons tree.** A tree that rests bare in winter and never dies.

*From* native-cook (`charts/tree-ring-chart`, `playground/fractal-tree-bloom`).

### Nice to have

- **Month jar** `RARE`. Each check-in drops a bead into a jar with real physics; the jar
  is a widget, and on the 1st it becomes a keepsake. *From* `gestures/mood-orb-jar`.
- **Tide of the week** `RARE`. Your energy across the week drawn as water you scrub
  through. *From* `charts/tide-gauge-chart`.
- **Rake the sand** `RARE`. A Sit variant: worries become stones and you rake slow grooves
  around them on the exhale. *From* `playground/zen-sand-garden`.
- **Pendulum breath** `NEW`. Fifteen pendulums drift in and out of sync, and that phase
  paces your breathing. *From* `playground/pendulum-wave`.
- **Breathing type** `NEW`. Any sentence on the screen becomes the breath pacer by
  swelling and thinning its font weight. *From* `text/weight-breathing-glyph`.
- **Pull the cord** `RARE`. Close out the day by pulling a lamp cord; the room dims to a
  night window. *From* `playground/pull-cord-light`.
- **Hands kit** `RARE`. Fidget toys (bubble wrap, jelly, marbles) offered when anxious
  hands need something, and fidgeting counts as showing up. *From*
  `playground/bubble-wrap-pop`, `gestures/jelly-cube-squish`.
- **What pulls at you** `NEW`. Place magnets for work, family, sleep or a person, and
  iron filings align toward the strongest pull: a map of where your energy goes. *From*
  `playground/iron-filings-magnet`.
- **Speak yourself down** `NEW`. A grounding script on the teleprompter only lights each
  word up at a calm pace, so racing through it doesn't work. *From* clarity (the Slow &
  Steady drill).
- **Paced mirror** `NEW`. The mirror streams at a pace you choose, or slows itself on
  heavy topics. *From* expo-animated-streaming-text (`playback-toolbar`).
- **Then and now** `NEW`. Two versions:
  - Play a line you said on the 3rd next to one you said today.
  - Drag a slider between how you wrote about a situation a month ago and how you write
    about it now.

  *From* clarity (playing your attempt next to the model), Inkigo (before/after slider).
- **Mood tints the app** `RARE`. Today's feeling colour seeds the whole palette. *From*
  expo-ui-examples (`material-you`).

### Lowest fit

- **Comfort-object stickers** `NEW`. Snap your mug or your dog and it's cut out into a
  sticker that Flux holds. Charming, but thin. *From* amber (`modules/subject-lift`).
- **Big-screen vent, Tabletop Flux** `NEW`/`RARE`. Two device-specific ideas:
  - Big-screen vent: your words appear large on the desktop or TV and burn away.
  - Tabletop Flux: Flux sits on a half-folded foldable on the nightstand.

  Both are niche hardware moments. *From* duo (dictation to a remote screen, foldable
  layout).

---

## F. Insight and memory you can trust

### Strongest fit

- **Memory you approve** `NEW` · all surfaces. Flux never remembers anything silently.
  It proposes a memory card ("remember your exams start June 3?") that you can confirm,
  edit or reject, and you can browse and delete every memory. Related:
  - **Say it, Xolace drafts it.** Ramble about your day and Xolace turns it into
    editable cards (mood, sleep, people, what helped). Nothing is saved until you tap.
  - **Visible remembering.** While it thinks, Flux says what it's reading ("looking back
    at your last three Sundays").

  *From* Mora (draft → confirm, the thinking row that names its tool,
  `src/components/chat/thinking-dropdown.tsx`). This builds on "Because you said…" in
  the earlier study.
- **Honest uncertainty, receipts and fine print** `NEW` · all surfaces.
  - **A "how sure" chip.** Every mirror line and every pattern carries a chip whose reason
    is about the evidence ("3 entries, all written after midnight"), never about how
    extreme the claim is.
  - **A "because…" link** to your own entries.
  - **An optional "fine print" section:** what could make this reading wrong.

  *From* oddswell (`utils/futbolConfidence.ts`, the Fine print tab), clarity (the coach
  must cite evidence, `convex/coachPrompt.ts`).
- **Stated vs revealed** `RARE` (Bearable shows correlations but doesn't act on them) ·
  mobile, web. What you said in onboarding steers your first paths. After that, which
  things led to "lighter" answers takes over, and Xolace can say so: "you said music
  helps, but walks have lifted you more often". *From* clarity (onboarding steers the
  first three sessions, then measured data, `lib/recommendations.ts`).
- **Words you reached for** `NEW` · mobile. Xolace tracks how you describe feelings over
  time. Growing emotional granularity (how precisely you name feelings), which research
  links to better outcomes, becomes an achievement and a gentle insight ("you've started
  naming 'overwhelmed' as 'stretched thin'"). Its counterpart is **words that weigh on
  you**: "sorry", "just", "always", "my fault", shown but never scored. *From* Inkigo
  (prompt history), clarity (`lib/fillers.ts`: some words are counted and shown but not
  scored).
- **"Why did Xolace reach out?"** `RARE` · all surfaces. Every outreach has a reason you
  can tap: "you said heavier, and it's been 2 days". That trust is what makes speaking
  first acceptable. *From* Expensify (Concierge trace).

### Nice to have

- **Re-read a reflection** `NEW`. Run an old mirror again with today's context and see
  how your reading has changed: evidence of growth. *From* oddswell (re-run).
- **Inner council** `NEW` · mobile, web. Parts work (from Internal Family Systems) as a
  short group chat you start yourself:
  - You name your parts (the Critic, the Worrier) and each speaks in its own voice.
  - Xolace moderates so they listen to each other.
  - A "decision council" variant brings in your future self, a wise grandparent and a
    friend.

  *From* rakazo (group handoffs, `packages/adapters/src/group-handoff.ts`).
- **Eyes-free Xolace** `RARE`. A mode for walking, driving or lying in the dark: prompts
  adapt to there being no screen, and Flux's face follows the voice. *From* Mora (the
  voice-mode prompt switch, audio orb).
- **Steer or park** `RARE`. In Talk, an interruption either steers the conversation now
  or parks the thought for a follow-up. *From* t3code (steer vs queue).
- **Emoji tuning** `RARE`. React to any companion line with an emoji to tune its tone;
  🫠 means "too much". *From* rakazo (`message-reactions.ts`).
- **Consent ledger** `RARE`. A live list of every AI provider that has processed your
  words, with the disclosure version you agreed to and a per-provider way to withdraw.
  *From* rakazo (`ai-consent.ts`).

### Lowest fit

- **Own your companion** `RARE`. Export Xolace's whole notebook about you as readable
  markdown, or host your memory on a desktop "home hub" of your own. This is a power-user
  and privacy story that's hard to keep in sync with clinical safety. *From* rakazo
  (portable home, local self-host).

---

## G. Everywhere: lock screen, Siri, channels

### Strongest fit

<a id="lock-screen-presence"></a>
**Lock-screen presence** · widget, watch.
Breathing Live Activities and Action-button panic tools are `RARE`: Sym Breathing,
Anxiety Tracker and Panic Exit have breathing Live Activities, and Rootd opens from the
Action button. The "I'm here" presence after an unresolved session, answerable as a
follow-up, is `NEW`. A plain widget is `COMMON`.
- **"I'm here" Live Activity.** After a session ends unresolved, a gentle presence stays
  on the Lock Screen and Dynamic Island for a few hours ("tap to breathe", "answer when
  ready"). It hands off to the follow-up, which you can answer right from the card.
- **Riding the wave.** A Live Activity for a panic or craving wave: "these usually crest
  in ~20 min, you're 8 in", with breathing on the Dynamic Island.
- **Action button: "Sit with me".** One press starts breathing in Flux's voice, even
  when locked. It must never fail because of network, payment or Plus status.
- **A Control Center "Sit now" button.**

This builds on the widget idea in the earlier study. The open lock-screen content rule
still applies.
*From* oyelo (Continue Listening intent, `Playback/ListeningShortcuts.swift`), t3code
(agent Live Activities), Inkigo (`targets/widget`).

**One-tap answers in the chat** `RARE` (Wysa and Woebot stay in their own apps) · channel.
A follow-up arrives with three buttons (lighter / still with it / heavier) and is
answered without opening anything. The rules come from Mora's `ask_user`:
- exactly one question;
- 3–5 chips;
- at most three turns.

This extends today's Telegram channel.
*From* convex-telegram (inline keyboards), convex-whatsapp (interactive buttons), Mora
(`src/components/chat/clarification-card.tsx`).

**Voice notes as Reflect, and a minute out loud** `RARE` · channel, watch.
- **Voice notes as Reflect.** Send a voice note to the bot and get a mirror back,
  optionally as short audio.
- **A minute out loud.** Xolace sends a one-minute speaking prompt ("a small joy",
  "advice to younger you"). Replying counts as showing up.

*From* convex-whatsapp, convex-telegram (inbound media), clarity (freestyle topics in
`constants/topics.ts`).

**WhatsApp-first Xolace** `RARE` · channel, b2b.
In markets where WhatsApp is the internet, Ghana included, Xolace works without an
install. This fits NGO partnerships.
*From* convex-whatsapp.

**"Hey Siri, tell Xolace I'm not okay"** `RARE` · mobile, watch.
Siri captures a check-in or vent without opening the app. It is queued offline and
becomes a follow-up. "What helped last time I couldn't sleep?" answers from your own
past entries, which are indexed in Spotlight.
*From* amber (capture token + App Intents in `app-intents/Intents/CaptureIntents.swift`,
`AmberSpotlight.swift`).

### Nice to have

- **Care links** `RARE` · web, channel. `xolace.app/sit?pattern=box-4` or a pre-filled
  Reflect prompt that a friend, therapist or creator can share. It never runs anything on
  its own, so it's safe to post publicly. *From* t3code (prompt links).
- **Letters over WhatsApp** `NEW` · channel. An opted-in recipient gets a letter as a
  template message with an "acknowledge" button. *From* convex-whatsapp (templates).
- **Slack App Home** `RARE` · channel. Your Today, follow-up and streak in your own Slack
  home tab. *From* convex-slack (`publishHomeView`).
- **Rotating keepsake widget** `RARE` · widget. "A line you wrote on a good day". It
  clears itself when the app lock is on. *From* amber (widgets plus app lock).
- **Morning care package** `RARE` · channel. Follow comforting blogs and newsletters;
  Xolace narrates new posts into a morning bundle, and therapists or organizations can
  publish their own feeds. *From* oyelo (RSS follow, `Core/FeedStore.swift`).

### Lowest fit

- **Doomscroll exit ramp** `NEW` · desktop (browser extension). At 2am, before you reach
  a known spiral site, Xolace asks "want 60 seconds of Sit first?". It needs broad
  browser permissions, which is a trust question. *From* Bluesky (link warning).

---

## H. Developers, CLI and desktop

Builds on [`b2b-surface-and-dev.md`](b2b-surface-and-dev.md), which already recommends
a `xolace checkin` command, a Claude Code plugin, an MCP server and opt-in strain
signals.

### Strongest fit

<a id="between-turns"></a>
**Between Turns** `RARE` (BreakingGap is an open-source Agent Skill that runs a short
reflection break in Claude Code or Codex; agent-wellbeing-kit adds quiet hours and
nudges for people running agents. Neither connects to a companion, follow-ups or the
phone) · dev-plugin, cli, desktop, mobile.
For people who supervise AI agents all day, the wait becomes recovery time:
- **While the agent works** (more than 60 seconds): the plugin offers a 40-second
  practice or a stretch.
- **When the agent needs approval:** it calls you back gently.
- **At the end of the day:** it summarizes your supervision load.

*From* t3code (agent lifecycle alerts, `apps/mobile/src/features/agent-awareness/*`),
duo (built for watching agents from the couch).

**Supervision-load meter** `NEW` · dev-plugin, widget.
Counts approvals per hour, parallel agent threads and context switches, shown like T3's
usage widget. Xolace speaks first when approvals spike late at night. The data belongs
to the user only.
*From* t3code (Usage dashboard, `apps/mobile/src/widgets/SubscriptionUsage.tsx`).

**Calm Remote** `NEW` · mobile + desktop.
One press on the phone dims every desk display to black and starts a 90-second Sit. The
break ends when you touch your real keyboard, so you choose to end it rather than a timer
ending it for you.
*From* duo (`Companion/OtherDisplaysDarkener.swift`).

**Wellbeing webhooks** `NEW` · dev-plugin, b2b.
Five red builds in a row, a 3am PagerDuty page or a fully booked day can trigger Xolace
outreach, for example a gentle check-in the morning after an incident. It's the developer
version of real-life checkpoints.
*From* t3code (webhook automations), convex-checkpoints, rakazo (GitHub webhooks).

**`xolace sound`** `NEW` · cli.
`xolace sound "rainy cabin, a bit fried"` generates and loops a soundscape from the
terminal. It's the CLI face of Sound of Right Now.
*From* endlessly.

### Nice to have

- **Step-away mode** `NEW` · desktop + mobile. When Xolace sees you watching an agent work,
  it suggests leaving the desk and mirrors only the "needs you" moments to your phone. The
  intervention is permission to walk away. *From* duo, t3code.
- **CLI garden** `NEW` · cli. An ASCII zen garden or field of tiles that breathes, a
  check-in tapped out in Morse, and replies streamed at a chosen pace. *From* native-cook
  (`playground/zen-sand-garden`, `playground/truchet-wave-tiles`).
- **`xolace save` / `xolace read`** `NEW` · cli. Save something to your Comfort Shelf, or
  have a letter read aloud, from the terminal. *From* oyelo.
- **Your Xolace context for your other AIs** `NEW` · dev-plugin, desktop. An MCP server
  (an interface other AI tools can call) lets your own Claude or ChatGPT read context you
  approved, such as "low-energy day: keep it short, no new tasks", so every assistant
  goes easier on you. The earlier research covered MCP for check-ins; this sends context
  outward. *From* oddswell (agent skill), t3code (outside agents over MCP with scoped
  OAuth).
- **Lid-close ritual** `RARE` · mobile + desktop. End the workday from the couch: park
  the windows, put the Mac to sleep, and count it as a work-boundary win. *From* duo
  (sleep/wake).
- **`xolace up` + "triage my day"** `NEW` · cli, desktop. A tiny background service that
  notices marathon sessions. Your own agent reads your calendar and commits and asks
  before suggesting anything. *From* t3code (background service, triage).

### Lowest fit

- **Voice linter in CI** `NEW` · dev-plugin (internal). Checks every prompt and AI
  response against Xolace's voice rules: no clinical jargon, no banned openers, takeaway
  first. Useful, but internal. *From* oddswell (`server/resultCopyGuidelines.ts`).

---

## I. Organizations (B2B)

### Strongest fit

<a id="proactivity-dial"></a>
**Proactivity dial** `NEW` · all surfaces + b2b.
Permission modes for how freely Xolace may speak first:
- **Supervised:** ask before each outreach.
- **Auto:** Xolace handles routine nudges.
- **Free:** Xolace speaks first freely.

An employer or school can **cap** the dial but never raise it. This answers the biggest
objection to proactive mental-health products: consent to being contacted.
*From* t3code (`docs/user/permission-modes.md`, managed policy).

**Manager-blind team check-ins** `RARE` (Officevibe-style pulse surveys exist, but they
aren't tied to a personal care loop) · channel, b2b.
- **Private check-ins.** `/xolace checkin` in Slack opens a private form, and answers go
  only into the person's own Xolace.
- **Team "weather".** The team sees only anonymous weather, with a minimum group size so
  no one can be singled out.
- **Private nudges.** Notes in Slack only that person can see ("you've been on since 7")
  are based only on activity the person agreed to share.

*From* convex-slack (modals, `postEphemeral`, App Home).

**Team Steward and a care wallet** `NEW` / `RARE` · b2b.
- **Team Steward.** An agent owned by the workspace auto-approves recovery mornings,
  "quiet day" requests or wellbeing-budget spends within policy. No human sees why, and
  it survives manager changes.
- **Care wallet.** A monthly allowance for whatever fits the person: swimming, a
  concert, pottery. Scan the receipt, it's approved, nobody asks for a justification,
  and the receipt becomes a keepsake.

Today, Modern Health and Lyra offer session caps, not a private wallet you can spend on
anything.
*From* Expensify (company agents, RuleBot, receipt scanning), convex-credits
(namespaces).

**Life compartments** `NEW` · b2b, mobile.
"Work me" and "home me" are separate spaces whose memories never mix. An
employer-sponsored Xolace can then promise that the private space is invisible to the
work one.
*From* rakazo (Spaces as authorization boundaries).

**Season outlook for campuses** `NEW` · b2b, admin.
An anonymised, aggregate forecast of stress peaks (exam weeks, quarter-end) so outreach
lands *before* the peak. Each person gets their own season plan. This is the
organizational form of Inner Forecast.
*From* oddswell (tournament forecast).

### Nice to have

- **Transition care** `RARE`. HR integrations trigger outreach at life transitions: a new
  hire's first month, return from parental leave, a manager change. *From* Expensify
  (BambooHR/Workday/Rippling sync).
- **Helper mode and therapist homework** `RARE`. In onboarding, users say "I'm going
  through something" or "I support others".
  - **Helpers** (therapists, coaches, teachers) assign homework between sessions:
    rehearsals, generated stories, reframe passages, sounds.
  - **Consented sharing.** Helpers see only the follow-up answers the client agreed to
    share.
  - **Client to therapist.** Clients bring their therapist's worksheets in, and Xolace
    cites them.

  *From* Inkigo (artist vs client modes), private-mind (Sources library), endlessly.
- **Handoff packet** `RARE`. A summary for a therapist or GP that the user curates: a
  readable PDF plus raw data, chosen item by item, or a PIN-encrypted bundle sent by
  AirDrop with no server involved. *From* Mora (journal export), oyelo
  (`Core/LibraryTransfer*.swift`).
- **Feelings stories for kids** `RARE` · b2b (schools, paediatric clinics). Parents or
  counsellors generate a story for a specific situation: a new sibling, moving, grief.
  It uses Endlessly's child-safe rules and moderation pass. *From* endlessly.
- **Corporate pay-it-forward** `NEW`. Companies give into the campfire pool as part of
  their CSR (corporate social responsibility) programme. See
  [Gifted care](#gifted-care).

### Lowest fit

- **Supervision-load analytics for employers.** As a team dashboard, the meter becomes
  surveillance. Keep it personal only.
- **Post-meeting debrief.** See [section A](#a-speaking-first-forecasting-and-sensing).

---

## J. Money and access

These are monetization mechanics that came up along the way. They are listed because
several are also care mechanics.

| Idea | Novelty | From |
|---|---|---|
| **Pay for moments, not months.** A hard-week pass, plus credit packs alongside the subscription for one-off generation | `NEW` for wellness | Inkigo `plans/credit-pack-monetization/` |
| **Plus moments for free users.** For example one generated sound and one Talk a month, reserved in a way that can't double-spend and released if abandoned. Anything generated stays yours after a subscription ends | `RARE` | clarity `convex/proPolicy.ts` |
| **Fair generation.** Sparks are reserved before generating, refunded on failure or on "this didn't help" | `RARE` | convex-credits |
| **Streak insurance IOU.** Borrow a streak freeze and pay it back by showing up later; if you don't, it's quietly forgiven | `NEW` | convex-credits (reserve with a later complete) |
| **Spark karma.** Spending sparks funds a real donation, such as a crisis line or a stranger's Plus month | `RARE` | Expensify TeachersUnite |
| **A public pledge.** Care features never move behind the paywall | `RARE` | oyelo `docs/MONETIZATION.md` |
| **AI cost guardrail.** A scheduled job alerts when estimated AI spend exceeds 50% of net revenue, needed once audio generation ships | internal | clarity `convex/costs.ts` |

---

## Genuinely new

These are tagged `NEW` and are not something a mainstream wellness app does, as far as
we know. The novelty is unverified; see [How to read this](#how-to-read-this).

### Proactive

- Things to look forward to
- "I'm here" Live Activity after an unresolved session
- Real-life checkpoints and the signal API
- Read-aware gentleness
- HRV-triggered check-ins
- Inner Barometer
- Withdrawal radar
- Three lenses
- Proactivity dial
- Season outlook

### User-made

- Iso Journey
- Pluck your feeling and Spatial Shelter
- Teach Xolace your thing
- If-this-then-care
- Generative micro-tools
- Living toolkits
- Your Story, Retold
- Nightmare rewrite studio
- Try on a future day
- Safe-place try-on
- Reframe passage read aloud
- Week in Panels
- Atmosphere from your reply

### Real life

- Rehearsal Room as a pre-game and post-game loop (rehearsal alone is common)
- Overwhelm decoder
- Go-outside prescriptions
- Mindful kettle
- Comfort media diary
- Worry shelf
- Worry deck
- Recovery buffers
- Capture the moment that stung
- "Show me" grounding
- Ask-for-help link

### Connection

- Support kits
- Kit Commons (unchecked)
- Letters with a body (warm, voiced, cross-language, stamps)
- Witness links
- Care rota
- Gifting earned sparks alongside a letter
- Sitting together
- Companion-to-companion
- Raise the flag
- Trusted listeners
- Care labelers
- Flux whispers
- New-here halo
- Matching keepsakes

### Sensory

- Waiting is breathing
- Release rituals (pour, shatter and mend, drift)
- Wordless body check-ins
- Pace-and-lead Flux
- Tree rings
- Pendulum breath
- Breathing type
- Speak yourself down
- Paced mirror
- Then and now

### Trust

- Memory you approve
- Honest uncertainty and fine print
- Words you reached for
- Re-read a reflection
- Inner council

### Developers and organizations

- Supervision-load meter
- Calm Remote
- Wellbeing webhooks
- `xolace sound`
- Step-away mode
- Context for your other AIs
- Team Steward
- Life compartments

### Rare: closest existing products

Ideas tagged `RARE` have a known neighbour. Know the neighbour before pitching:

| Idea | Closest existing product |
|---|---|
| Inner Forecast | Tranquilo ("weather app for mood"), MoodQuad, Emotion Tracker |
| Voice Weather | Sonde Mental Fitness (consumer); Kintsugi (closed, models public) |
| Sound of Right Now | Moodusic, MuseAI MoodSync, Mubert API; Endel (adaptive, not from words) |
| Next small step chips | Mentavo, Calmplot |
| Lock-screen breathing, Action button | Sym Breathing, Anxiety Tracker, Panic Exit, Rootd |
| Between Turns | BreakingGap, agent-wellbeing-kit (open source) |
| Gifted and sponsored Plus | Bearable Heroes, Rootd sponsors, ShareWell Access Fund |
| Rehearsal (without the follow-up loop) | TalkSimulator, Boundary Trainer AI, Yoodli, Prehearse |
| Feeling field | How We Feel (mood grid) |
| Tonight's Story | Calm (generic sleep stories) |
| Stated vs revealed | Bearable (correlations only) |
| Comfort Shelf | Hope-box apps |
| Manager-blind check-ins | Officevibe (pulse surveys) |

---

## Market check of the big bets

Checked with web searches on 2026-11-16. Most evidence is app-store listings and vendor
pages, so it shows what products *claim*, not how well they work. A search that finds
nothing is not proof that nothing exists; it means nothing prominent turned up.

| Big bet | Before | After | What turned up |
|---|---|---|---|
| Sound of Right Now | `RARE` | `RARE` | General creative apps generate music from a typed mood ([Moodusic](https://play.google.com/store/apps/details?id=com.app.musicxy&hl=en), [MuseAI](https://muse-ai-melody-maker.lovable.app/)); [Mubert](https://mubert.com/api/use-cases/ai-music-for-digital-therapeutics-apps) sells text-to-music to digital therapeutics. None sits inside a support loop. |
| Iso Journey | `NEW` | `NEW` as a product | The iso principle is in trials ([NCT07055061](https://clinicaltrials.gov/study/NCT07055061), [NCT05442099](https://clinicaltrials.gov/study/NCT05442099)); no consumer app generates the arc. Spotify and Endel showed no such feature. |
| Inner Forecast | `NEW` | `RARE` | [Tranquilo](https://tranquilowearables.com/) ("your weather app for mood"), [MoodQuad](https://moodquad.com/) (HRV mood forecast), [Emotion Tracker](https://emotion-tracker.app/) (claims dips 3–7 days ahead). Research forecasts mood a few days out, with accuracy falling as the horizon grows ([PMC7367518](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7367518/)). |
| Teach Xolace your thing | `NEW` | `NEW` | Neighbours learn preferences or let you add tasks, but don't turn your own ritual into a tool offered at the right moment ([Stressie](https://apps.apple.com/us/app/stressieapp/id6737459302), Virtual Hope Box, Finch custom tasks). |
| If-this-then-care | `NEW` | `NEW` | No user-written care rules found. Closest: an inactivity timer that alerts a contact ([Are You Okay?](https://areyouoke.lovable.app/)) and automatic risk alerts ([CheckIn](https://appfelstrudel.com/id/6747275085/checkin-mental-health.html)). Design guidance says not to contact people without the user's confirmation ([therappai docs](https://therappai.gitbook.io/therappai-docs/documentation/core-concepts/crisis-buddy-and-safety)). |
| Next small step chips | `NEW` | `RARE` | [Mentavo](https://peerlist.io/mentavoapp/project/mentavo) proposes a next-step card; [Calmplot](https://apps.apple.com/app/id6758394565) offers one tiny step. Neither deep-links into real actions. |
| Rehearsal Room | `NEW` loop | rehearsal `COMMON`, loop `NEW` | Many rehearsal apps ([TalkSimulator](https://apps.apple.com/us/app/id6746222501), [Boundary Trainer AI](https://apps.apple.com/us/app/id6757921278), [Rehearsal Room AI](https://apps.apple.com/app/id6764187374), [roundup](https://www.vocalimage.app/en/articles/37-practice-difficult-conversations-ai-apps/)). None follows up after the real conversation. The name is taken. |
| Support kits | `NEW` | `NEW` | Only referral links and content sharing ([Haley](https://itsallwidgets.com/haley-self-care-journal), [Shmoody](https://kapofedigadi.pages.dev/shmoody-review)); no shareable toolkit that sets up the recipient's app. |
| Voice Weather | `RARE` | `RARE` | [Sonde Mental Fitness](https://www.sondehealth.com/news-blog/voice-biomarker-tech-analyzes-your-voice-for-signs-of-depression) is a consumer voice-journal app. [Kintsugi closed in February 2026 and released its models](https://bhbusiness.com/2026/02/11/mental-health-voice-biomarker-kintsugi-closes-makes-all-technology-and-research-public/). |
| Lock-screen presence | `NEW` | parts `RARE`, "I'm here" `NEW` | Breathing Live Activities ([Sym Breathing](https://apps.apple.com/app/id6575391114), [Panic Exit](https://apps.apple.com/app/id6764320483), [Anxiety Tracker](https://www.producthunt.com/p/anxiety-tracker-mood-journal/anxiety-tracker)); Action-button launch ([Rootd](https://apps.apple.com/ai/app/id1289018369?l=en-gb)). Nothing holds an unresolved session until its follow-up. |
| Between Turns | `NEW` | `RARE` | [BreakingGap](https://github.com/m1nga/breakinggap) (break skill for Claude Code and Codex), [agent-wellbeing-kit](https://github.com/joozio/agent-wellbeing-kit). Both small open-source projects. |
| Gifted care | `NEW` | parts `RARE`, spark gifting `NEW` | [Bearable Heroes](https://bearable.notion.site/Do-you-offer-sponsored-subscriptions-1e57d0d874b0804da801f41657ed1965), [Rootd sponsors](https://www.rootd.io/sponsorship/), [ShareWell Access Fund](https://sharewellnow.com/access-fund), [Calmerry gifts](https://calmerry.com/gift). |
| Proactivity dial | `NEW` | `NEW` | Only user feature requests ([OpenAI forum](https://community.openai.com/t/feature-idea-user-controlled-proactive-ai-conversations/1400266)); no product, and nothing with an employer cap. |

**What it means.** The pieces that are most clearly Xolace's own are the ones that join
a mechanic to Xolace's loop of follow-ups, sparks and letters:

- the iso arc;
- user-taught rituals and user-written care rules;
- support kits;
- the follow-up after a rehearsal;
- "I'm here" on the lock screen;
- gifting earned sparks;
- the proactivity dial.

The downgraded ones are still strong fits, but a pitch should lead with the loop, not
the mechanic.

---

## Principles worth adopting now

These are cheap rules taken from how the sample apps behave. Most cost nothing to adopt
and protect everything above.

1. **The AI drafts, the user commits.** Nothing structured is saved until the user taps,
   and a confirmation can't be applied twice. *From* Mora.
2. **Code computes, the AI words it.** Scores, streaks, forecasts and escalation come from
   code you can audit; the model only explains them. *From* oddswell.
3. **Confidence reflects the evidence, not how dramatic the claim is.** Every repair or
   gap *lowers* the confidence shown. *From* oddswell.
4. **Every insight cites its evidence.** *From* clarity's coach.
5. **The AI may only touch what's still "suggested."** It never overrides something the
   user saved or dismissed. *From* amber spaces.
6. **The AI proposes only from a fixed list of actions.** It never invents an action.
   *From* amber intents.
7. **Celebration etiquette:**
   - Never celebrate during Vent, Care or crisis flows; queue the badge for a calm moment.
   - Combine several milestones into one celebration.
   - Never repeat a celebration.
   - Keep what was earned even after data is deleted.
   - Quiet unlocks are the default on heavier days.

   *From* oyelo, duo.
8. **Never a zero.** A short or interrupted session still counts as showing up and shows
   "we couldn't read this one", never a bad score. *From* clarity.
9. **Ask only on a lighter day.** Review, share and referral prompts appear only after a
   "lighter" answer or a badge, at most once per version. *From* oyelo, duo.
10. **One attention budget.** Outreach, announcements and prompts share one cap on how
    often Xolace may interrupt. *From* Bluesky (announcement snoozing).
11. **Every way in has a way out.** Every state can be undone: snoozed, settled, paused,
    unlinked. *From* t3code.
12. **Nothing stays pressed.** Shared state (a Trusted Bridge share, a live presence)
    releases itself when interrupted or when it times out. *From* duo.
13. **Links never run anything by themselves.** A shared link pre-fills; the user presses
    go. *From* t3code.
14. **Never shorten the user's words.** Handoffs between voice, text, peer and clinician
    may select context, but never truncate what the user wrote. *From* t3code.
15. **Store each session's timezone.** A "showed up" day then survives travel and
    daylight-saving changes. *From* clarity.
16. **Moderate everything generated or shared, with a gentle fallback.** If a generated
    image or sound is blocked, retry with a safe prompt instead of failing. *From*
    endlessly.

---

## Unused native-cook blocks worth adopting

The redesign already cites about 140 native-cook blocks. These are not cited yet. The
paths are under `native-cook-main/react-native/src/blocks/`.

| Block | Where in Xolace |
|---|---|
| `animations/ink-drop-bloom`, `animations/shatter-glass-transition`, `text/wind-scatter-letters` | Vent release rituals; reframe in Reflect |
| `playground/clay-press-blob`, `playground/ferrofluid-blob` | Wordless body check-in |
| `pickers/magnetic-feeling-field` | Check-in feeling picker |
| `gestures/mood-orb-jar` | Steadiness month view, widget |
| `playground/zen-sand-garden`, `playground/pendulum-wave` | Sit variants |
| `playground/pluck-string-harp`, `pickers/wind-chime-tones`, `media/music-box-player`, `media/spatial-orbit-mixer` | User-made sound |
| `charts/tide-gauge-chart`, `charts/tree-ring-chart`, `charts/stress-dot-grid-donut`, `charts/sky-screen-time` | Steadiness and patterns |
| `cards/daypart-weather-bands`, `modals/frost-wipe-alert` | Inner Forecast on Today |
| `cards/thermal-reveal-card`, `cards/crayon-rubbing-card`, `pickers/stamp-diary-calendar`, `cards/postcard-stamp-cancel` | Letters, peer reflections |
| `playground/fractal-tree-bloom` | Kindling yearly view |
| `progress/kettle-boil-progress`, `progress/candle-burn-timer`, `progress/sand-hourglass` | Mindful kettle |
| `playground/pull-cord-light` | Bedtime close-out |
| `gestures/slide-to-answer-cord` | Flux calls you |
| `playground/cloth-flag-mesh` | Raise the flag (Trusted Bridge) |
| `text/weight-breathing-glyph` | Breath pacer anywhere |
| `gestures/day-one-medal`, `progress/geode-focus-reward` | Badge reveal |
| `gestures/zipper-unlock` | Private journal lock |
| expo-ui `liquid-glass`, `swift-charts` | Sitting together; native Steadiness charts |

---

## Feasibility notes

- **Voice-reactive visuals need real microphone metering.** The native-cook voice blocks
  fake their audio level. Voice Weather, Pour It Out by voice and the voice orb all need
  live levels from expo-audio passed into the Skia/WebGPU shaders.
- **No block uses motion sensors.** Tilt and shake in native-cook are touch gestures, so
  anything that should respond to tilt needs expo-sensors.
- **Generated audio is proven in a sample.** Endlessly runs Stable Audio 2.5 on
  Replicate and ElevenLabs `sound-generation` with `loop: true`. For narration it uses
  MiniMax speech, which can control emotion. Cost per generation decides how Plus is
  shaped; see [Money and access](#j-money-and-access).
- **New native pieces are needed:**
  - Live Activities, widgets and App Intents need native targets (see the patterns in
    amber, oyelo and Inkigo).
  - HealthKit and Health Connect are not in either repo yet.
- **Lock-screen content is still an open rule** from the earlier study. It must be
  decided before lock-screen presence ships.
- **The store-gap rule applies.** Everything here that touches Convex would be new
  tables, functions or optional fields, which fits the "additive only" constraint.
- **Agreed already: Vault mode** (on-device opt-in, decided 2026-11-03). Ideas that read
  personal data (voice, calendar, health) should respect it: what can't leave the phone
  is either computed on the phone or not computed at all.

## Questions for the team

1. **How far may sensing go?** Voice features, calendar, health, read receipts and
   terminal activity all power the proactive ideas. Which are in scope, and is each
   opt-in on its own?
2. **Do we open public sharing of user-made tools?** That means support kits in the
   [Kit Commons](#kit-commons), coping recipes and generated sounds in the peer pool. It
   needs a moderation pipeline like the one peer reflections already have. Decided so
   far (2026-11-16): creators choose anonymous or named display, and a kit always links
   to its creator's account.
3. **Do we build group spaces?** Several connection ideas (circles, care rota, reply
   gates) assume them; Xolace today is 1:1 plus broadcast.
4. **Is generation a Plus feature, a spark spend, or both?** This decides the shape of
   Sound of Right Now, micro-tools and stories.
5. **What is the B2B posture?** Does the first organizational customer look like an
   employer (Slack, care wallet), a campus (season outlook) or a clinic (helper mode)?
