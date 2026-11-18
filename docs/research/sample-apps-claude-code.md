# Feature ideas from eleven sample apps

Researched 2026-11-14 by Claude Code. These ideas are meant to spark discussion. None of them are port plans and none are decided.

**The question.** What can Xolace take, or work out, from these apps to give users experiences nobody has offered before? The four pillars are:

1. Preventive, proactive support
2. Support that actually fits: the small things people already do
3. Support made on the spot
4. Human connection

The source feature is rarely the point. What matters is the idea that comes out of it.

**Baseline.** Ideas were checked against two things:

- the redesign prototype at `repos/Other-projects/xolace-redesign-1`: its Today, Explore, Connect and You tabs, the Reflect and mirror flow, Letters, Kindling, Talk and Vent, and the owner's decisions in `design/handoff/porting/open-questions.md`
- the production app plus `docs/plan/` and `docs/research/`

Ideas that Xolace already has or already plans say so. Three of these repos (companion, private-mind, rakazo) were mined before in [sample-apps/](sample-apps/README.md). This pass only adds ideas that pass missed or skipped.

## How to read this

**Fit**, which is how each idea is ranked:

| Tier | Meaning |
|---|---|
| **Strongest fit** | Serves a pillar directly and has a natural home in the redesign |
| **Lower fit** | Worth having, but further from the pillars, riskier, costlier, or waiting on an ecosystem that doesn't exist yet |
| **Nice to have** | Polish and delight |

**Novelty**, judged against mainstream wellness and mental-health apps: Calm, Headspace, Wysa, Woebot, Daylio, Finch, Bearable, Stoic, Rosebud, How We Feel, Fabulous and similar.

| Tag | Meaning |
|---|---|
| 🆕 **New** | None of these apps does it |
| ◐ **Twist** | Something similar exists; our angle doesn't |
| ● **Exists** | Already common in wellness apps |

**Effort** is S, M or L. 🔭 marks a horizon bet, something that only makes full sense 5–10 years out. **Home** says where the idea would live in the redesign's IA.

**Source tags.** File paths are relative to `sample apps/<repo>-main/`.

| Tag | Repo | What it is |
|---|---|---|
| AM | amber | "Save anything" app with very deep iOS integration: App Intents that run without launching JS, Visual Intelligence, Spotlight, a share extension, widgets, Vision subject-lift and a camera-roll swipe deck. Expo + Convex + Clerk. |
| CL | clarity | Speech practice. A teleprompter follows your voice, with on-device recognition plus an aligner, prosody scoring, and AI coaching that must cite its evidence. Expo + Convex + Clerk. |
| OY | oyelo | Native iOS app that turns a reading list into audio. Share extension, interactive widgets, Siri/Action button, background generation with a Live Activity, on-device Apple Foundation Models. |
| MO | Mora | Chat-first nutrition journal. What you say becomes an editable draft card you confirm. Gemini Live voice, HealthKit, barcode scanning. |
| EN | endlessly | AI bedtime stories for kids: a GPT story, consistent illustrations, TTS narration and a looping generated ambient bed for each chapter. |
| ME | Medley | Movies, TV, games and books tracker. Recommendations from favourites, nearby showtimes, a radial gesture menu, a Skia aurora, an agentic release pipeline. |
| OD | oddswell | AI sports predictions. Code computes the numbers and the LLM only explains them, with confidence badges, risk flags and re-runnable reads. |
| T3 | t3code | Control plane for coding agents. Threads that snooze and settle, queue vs steer, forks and rewind, Live Activities, guest links, prompt links, scheduled and webhook tasks, interactive HTML replies, MCP. |
| RK | rakazo | Persistent AI teammate with routines, skills taught by demonstration, sandboxed artifacts, bot-to-bot connections and voice calls. |
| CO | companion | Cal.com mobile app, browser extension and CLI: event-triggered workflows, availability limits, private links, widgets. |
| PM | private-mind | On-device LLM with document RAG and citations, source-agreement checks, an offline model hub and a haptic vocabulary. |

---

## The big bets

The same ideas kept turning up across repos. Grouped together, they point to eleven directions. Each one is larger than any single feature, and none of them is something wellness apps do today.

1. **Xolace sees hard moments coming.** It learns each person's baseline and hard hours, reads their calendar and dates, and looks ahead ("watch out for…", a game plan before the interview) instead of only logging after the fact. *S1–S9*
2. **Xolace lives outside the app.** Share sheet, Siri and the Action button, Lock Screen presence, widgets, a desktop hotkey. Support begins where the moment happens, in a text from your boss or at 2am in bed. *S10–S15*
3. **Your own playbook, learned from you.** Xolace captures what *you* actually do when it's hard, builds it into a toolkit across every sector (food, games, people, places, shows), and offers it at the right moment. *S16–S25*
4. **Making things on the spot, beyond music.** Soundscapes from a memory, stories where you are the quiet hero, small interactive tools built for this exact moment, and generation time spent breathing. *S26–S32*
5. **Your voice and body as the medium.** Read yourself calm, hear your lighter self, rehearse the hard conversation, a walk-and-talk mode. *S33–S38*
6. **Doing, not just talking.** Tap-to-act next steps, a concierge for dreaded tasks, a friend-time finder, rest written into the real calendar, "somewhere to go right now". *S39–S46*
7. **Human connection that crosses borders and apps.** Letters in any language read aloud, one-time care links for people not on Xolace, expiring guest views, companions that know each other. *S47–S52*
8. **Trust you can see.** Every insight shows its evidence and how sure Xolace is, numbers come from code, you can correct memory by talking, and proactivity has a consent dial. *S53–S58*
9. **The things Xolace holds for you.** A life inbox where worries snooze, things settle, and Xolace shows what it is holding and what it did for you. *S59–S61*
10. **Answers sized to you.** A depth dial, response lenses, "ask three ways", one question at a time, and replies that take their time on purpose. *S62–S65*
11. 🔭 **Xolace as the wellbeing layer other software asks.** A capacity signal your work AI, fitness app and calendar respect, and Xolace exposed as a system skill or MCP server. *S66*

### If we only look at twelve

These have the best mix of fit, novelty and buildability on the redesign:

| # | Idea | Why |
|---|---|---|
| 1 | **S1** Wellbeing sentinel + your hours | Reaching out first, with a no-spam contract |
| 2 | **S16** Your playbook, learned from you | Pillar 2 at its most literal |
| 3 | **S10** Share-in with intents (incl. doomscroll rescue) | The cheapest way to meet people in their real life |
| 4 | **S3** Scouting report + rituals around hard events | Preventive and specific to the person |
| 5 | **S14** Lock Screen presence | "Still here · breathe with me" without opening the app |
| 6 | **S26** Make me a room | The music pillar's sibling: a soundscape from a memory |
| 7 | **S34** Your own voice as medicine | Lighter-self notes, hearing your own reframe |
| 8 | **S39** Tap-to-act next steps | Session end turns into one real action in your life |
| 9 | **S47** Letters across languages, read aloud | Grows the letter pool and makes letters something you can hear |
| 10 | **S53** Evidence + confidence + numbers from code | Makes every other AI feature trustworthy |
| 11 | **S59** Life inbox | Snooze a worry, watch things settle |
| 12 | **S30** Generation wait becomes a breath | A small cost; it turns latency into support |

---

## Strongest fit

### Proactive and anticipatory (pillar 1)

**S1. Wellbeing sentinel and "your hours"** · 🆕 New · M–L · Home: outreach layer
- **From:**
  - **ME** `.eas/workflows/release-sentinel.yml` and `scripts/release-health-gate.mjs`: an hourly health gate compared against a baseline, a "too little data means healthy" rule, and each issue raised once only.
  - **OY** `Oyelo/Features/UsageView.swift`: a heatmap of peak hours.
  - **MO** `src/features/health/import.ios.ts`: opt-in HealthKit.
- **Idea:** Apply release-health logic to a person.
  - **What it compares:** the last few days against the user's *own* baseline: later app opens, shorter check-ins, a run of "heavier" answers, and opt-in sleep and steps.
  - **How it speaks:** at most one gentle outreach per pattern. It doesn't repeat until the pattern resolves, and it stays silent when data is thin.
  - **When it speaks:** it learns the user's hard hours (they open Vent around 11:40pm) and reaches out about 30 minutes *before*: "Before tonight gets long, want a 3-minute wind-down?"
  - **From body data:** "You slept about 4h, so today's suggestions are lighter."
- **Builds on:** the outreach layer's pattern nudges and the Phase 6 HealthKit plan. Weight should never be imported.

**S2. "Watch out for" card and tender dates** · 🆕 New · M · Home: Today and the Coming back card, plus outreach
- **From:**
  - **OD** `components/sports/combat/RiskFlags.tsx`: 0–4 forward-looking caveats.
  - **CO** `EditAvailabilityOverrideScreen*.tsx`: date overrides.
- **Idea:** Once a week, a card titled "Things that could trip you up this week" drawn from memory and the calendar: an anniversary, exam week, the day before payday, a known Sunday dip. Each flag schedules its own gentle outreach.
  - Users can also mark **tender dates** themselves (a loss, a court date, the first holiday apart).
  - On a tender date Xolace checks in earlier and more gently, softens content, and can have a letter waiting.
- Apps today only look back at mood. None look forward.

**S3. Scouting report and rituals around hard events** · 🆕 New · M · Home: Today, Talk, follow-ups
- **From:**
  - **OD** `components/sports/mma/Form.tsx` and `server/combatResearch.ts`: strengths, pressure points, conditions and a game plan.
  - **CO** `packages/cli/src/commands/team-workflows/`: `beforeEvent` and `afterEvent` triggers with offsets.
  - **CL** `app/passage-editor.tsx`: practise the speech you have to give.
- **Idea:** The user names a hard event (interview, talk with a parent, exam, first date, a eulogy), or Xolace sees it on the calendar.
  - **Before:** a short game plan built from memory: your strengths here, likely pressure points, conditions (sleep, food, commute), an opening line, an exit plan.
  - **30 minutes before:** a confidence ritual.
  - **An hour after:** a decompression.
  - **The next morning:** a follow-up.
  - **With consent:** a 95-minute call with your manager triggers the decompression on its own.

**S4. Life triggers: rituals the user builds from other parts of life** · 🆕 New · M–L · Home: Settings → Rituals, plus outreach
- **From:**
  - **T3** `apps/server/src/scheduledTasks/Schedule.ts`: once, interval, weekday and webhook triggers, with signature checks, de-duplication and a grace window.
  - **OY** `docs/APP-INTENTS.md`: Shortcuts automations.
- **Idea:** "When ___ happens, Xolace ___." Examples:
  - Weekdays at 8am, ask how I slept.
  - When my Strava run ends, play a cooldown song.
  - On payday, a calm money check.
  - Food delivery at 2am three nights running brings a gentle check-in.
  - A back-to-back calendar brings a 3pm breather.
  - Arriving home from work starts a decompression ritual.
- **Builds on:** the earlier "user-authored routines" idea, here driven by events from other apps instead of only clock times.

**S5. Shared-moment outreach** · 🆕 New · S–M · Home: outreach
- **From:** **OD** `app/(tabs)/home/futbol/worldcup-2026/matches.tsx` and `utils/wcMatchDateTime.ts`.
- **Idea:** Users opt in to "teams I care about". After a painful loss (a final, a relegation) Xolace sends one warm note or a commiseration song, and it marks the wins too.
  - The same mechanism covers moments many people go through together: exam results day, elections, a national tragedy, Christmas alone.

**S6. Vocal drift signal (opt-in)** · 🆕 New for consumer apps · L · Home: Talk and Vent, feeding the sentinel (S1)
- **From:** **CL** `convex/coachPrompt.ts` (pace, pauses, longest pause, monotone words) and `services/azure-assessment.ts` (prosody).
- **Idea:** Across voice vents and Talk, Xolace notices slower pace, longer pauses and flatter prosody compared with the user's *own* baseline over weeks.
  - It is never shown as a score and never diagnoses.
  - It only makes a check-in a little more likely: "You've sounded tired lately. Want to talk?"
  - Clinical vendors (Kintsugi, Sonde) do this; no consumer app does.
- **Caution:** Vent audio is never kept, so the features would have to be extracted on the fly.

**S7. "Have you eaten?" outreach** · 🆕 New as outreach · S–M · Home: outreach
- **From:** **MO**, the food journal and evening reminder.
- **Idea:** If the user mentioned skipping meals, or their pattern dips, a warm nudge arrives at their usual mealtime with a no-cook idea: "Have you eaten today? Even a snack counts." No calories, ever.

**S8. Watchers** · 🆕 New · M · Home: outreach, You
- **From:** **RK** `packages/adapters/src/release-watch.ts`: a daily watch routine that stays silent unless something changes.
- **Idea:** Xolace watches things for the user and speaks only when they change: a therapist slot opening, a waitlist moving, a seat in a support group, a prescription back in stock, cheaper therapy appearing nearby. Access to care is a real pain point.

**S9. Things to look forward to** · 🆕 New · M · Home: Today, outreach
- **From:** **ME** `lib/upcoming-sections.ts`: upcoming releases grouped into Today, Tomorrow and dated sections.
- **Idea:** An anticipation calendar.
  - Users add their own things: a friend's visit, a holiday.
  - Xolace finds others: a favourite artist's album, a show's new season, match day.
  - On hard days and in outreach, Xolace shows countdowns: "3 days until ___". Anticipation reliably lifts mood.

### Xolace outside the app

**S10. Share-in with intents, including doomscroll rescue** · 🆕 New · M · Home: share extension → Reflect, Kit or Letters
- **From:**
  - **AM** `src/app/+native-intent.ts` and `src/lib/share-intake.tsx`.
  - **OY** `OyeloShare/ShareViewController.swift`, `Shared/ShareInbox.swift` (an App Group inbox) and `Oyelo/Import/XThreadExtractor.swift`.
  - **T3** `apps/mobile/src/features/sharing/`.
  - **AM** `convex/ai.ts`: finds the source of a screenshot.
  - **PM** `utils/web/sourceAgreement.ts`: checks whether sources agree.
- **Idea:** From any app, share a painful text, a reel, a news thread or a song link into Xolace and pick an intent:
  - **Help me with this:** opens Reflect with the item attached.
  - **Keep this, it helped:** adds it to the user's kit.
  - **Write a letter about this:** opens the letter composer.
  - **Remind me later.**
- **Variants:**
  - **Doomscroll rescue:** separates what is known from speculation, says what's in your control, offers a 2-minute reset, and sets "check back tomorrow, not tonight".
  - **"Is this even real?":** finds the original source, its date, and whether it's old news or satire.
  - **Wellness-claim check:** for posts like "magnesium cures anxiety", shows what is corroborated and what comes from a single source.

**S11. "This got to me": screen capture, plus a desktop hotkey** · 🆕 New · M–L · Home: OS level → Reflect
- **From:**
  - **AM** `app-intents/Support/CaptureRouter.swift` and `ImageCapture.swift`: "save this" reads whatever is on screen with on-device OCR.
  - **T3** `docs/user/snap-shot.md`: a global hotkey captures a window plus its accessibility text.
- **Idea:** While looking at a hurtful message, email or comment, the user says "Xolace, this got to me".
  - The text is read on the device and becomes a private reflection seed, and the next day's follow-up revisits it.
  - The other person's identity is never stored.
  - In the Tauri desktop app, a hotkey does the same for the stressful email or spreadsheet.

**S12. Siri, the Action button and quick actions** · ◐ Twist · M · Home: OS level
- **From:**
  - **AM** `app-intents/Intents/CaptureIntents.swift` with `convex/http.ts` `/app-intents/capture`: zero-launch capture using a hashed per-device token.
  - **OY** `Shared/PlaybackIntents.swift`.
  - **T3** `apps/mobile/src/features/shortcuts/appShortcuts.ts`.
  - **AM** `AmberShortcuts.swift`: phrases that file into a folder.
- **Idea:**
  - "Hey Siri, tell Xolace I'm overwhelmed" logs the moment in about 2 seconds without opening the app. Siri answers with one warm line, and a follow-up card is created for later.
  - Holding the Action button, or saying "ground me", starts a 60-second grounding.
  - "Add 'a hot shower' to my things that help" builds the user's playbook (S16) by voice.
  - Long-pressing the app icon offers *I need to calm down*, *Vent now*, *Make me a song* and the last conversation.

**S13. Interactive widget with privacy blanking** · ◐ Twist · M · Home: Home Screen
- **From:**
  - **AM** `src/widgets/recent-saves-widget*.tsx` and `src/lib/widget-sync.tsx`: the widget blanks when the app is locked.
  - **OY** `Shared/WidgetConfiguration.swift`: the user chooses what the widget shows.
  - **CO** `apps/mobile/targets/widget/widgets.swift`.
  - **T3** `widgets/AgentActivityWidget.tsx`.
- **Idea:** The user chooses the widget's content:
  - the open follow-up with **lighter / still with it / heavier** buttons, answered on the Home Screen;
  - the first line of a received letter;
  - a breathing orb you tap and breathe with without opening the app.
- It goes blank when the app lock is on, and a discreet mode shows only a colour.
- **Builds on:** outreach Phase 4 in `proactive-outreach-channel.md`. This adds the letter widget and the blanking.

**S14. Lock Screen presence (Live Activities)** · 🆕 New · M · Home: Lock Screen and Dynamic Island
- **From:**
  - **T3** `apps/mobile/src/widgets/AgentActivity.tsx`: phase colours, items that need you sorted first.
  - **OY** `Oyelo/Core/GenerationController.swift`: `BGContinuedProcessingTask`, and the first section plays while the rest is still generating.
  - **RK** `RakazoNotificationService.kt`: a promoted ongoing notification.
- **Idea:** Four uses:
  - **Your song:** "Your song for tonight… 60%". The first 20 seconds play as soon as they exist.
  - **Your letter:** "Your letter is on its way to a stranger."
  - **Still here:** "Still here · 12 min · breathe with me" during a panic, a craving or a hard hour. Tapping it opens breathing, and it ends with a follow-up.
  - **A countdown:** "Checking in at 9pm".
- **Builds on:** the "acute Live Activity" already on the roadmap.

**S15. "Just for your eyes", with a disguise** · ◐ Twist · S–M · Home: Settings → Privacy
- **From:**
  - **AM** `src/lib/app-lock*.ts` and `src/components/privacy-screen.tsx`: the lock also covers deep links, the share extension, the widget and Spotlight; the app-switcher is blurred; Android uses `FLAG_SECURE`.
  - **OY** `Oyelo/Features/AppIconView.swift`: alternate icons.
- **Idea:** A biometric lock offered during onboarding, covering every surface Xolace appears on. Plus:
  - a neutral "Notes"-style icon and name;
  - neutral notification previews;
  - a quick-hide gesture that switches to a decoy screen.
- This matters for people with controlling partners or parents. It also answers the open question in the earlier research about what can show on a Lock Screen.

### Your own playbook (pillar 2)

**S16. Your playbook, learned from you** · 🆕 New · M · Home: You → Kit, plus Today
- **From:**
  - **RK** `packages/core/src/teach-playbook.ts` and `apps/web/src/components/teach/SkillDraftCard.tsx`: a demonstration becomes an editable playbook with `whenToUse / steps / howToCheck / failureHandling`.
  - **MO** `src/screens/meal-builder-screen.tsx`: saved composite meals.
- **Idea:** The user says or shows what they *actually* do when spiralling ("cold water, the playlist, text Jo, walk to the corner"). Xolace turns that into their own playbook: when to use it, the steps, how you'll know it worked, and what to do if step 2 fails.
  - Xolace walks them through it with timers.
  - When the "when" matches, Xolace offers it: "This looks like your Sunday-night thing. Run your reset?"
  - Named rituals ("Post-shift reset" = 2-minute breath → your calm track → one prompt) replay in one tap.
- Safety-plan apps only offer static templates.

**S17. Toolkits that build themselves** · 🆕 New (Virtual Hope Box is the closest niche app) · M · Home: You → Kit, plus Explore
- **From:**
  - **AM** `convex/ai.ts` (`recommendForSpace`, `steerItemForSpace`) and `spaces.dynamic`.
  - **OY** `Oyelo/Core/ArticleCollectionStore.swift`: emoji and colour collections.
- **Idea:** Users name a kit in their own words: "Sunday-night dread", "Before exams", "When I miss Dad".
  - Xolace fills it from past songs, exercises, letters, quotes, reflections and photos, favouring items after which a follow-up came back **lighter**.
  - With "Dynamic" on, new things keep arriving.
  - The kit's name steers the companion: the same song gets different follow-ups in "Getting through the divorce" and in "Gym energy".

**S18. A "what helps me" graph across every part of life** · 🆕 New · L · Home: You, Explore
- **From:** **ME** `lib/genremapper.ts` (`unified_genres` across films, TV, games and books), mixed-media collections, and the comfort-rewatch pattern.
- **Idea:** One taxonomy (soothing, energising, connecting, absorbing, embodied) covering songs, foods, walks, people, places, shows, games and chores.
  - **Comfort shelf:** watching *The Office* for the 9th time is logged as legitimate self-care ("comfort is allowed").
  - **Cozy game sized to now:** "20 minutes, low energy" gets one specific cozy game session.
  - **Quick wins row:** water, stepped outside, took meds, texted someone (from **MO** `home-screen.tsx`). Each counts as showing up.
  - **Use log:** every time the user reaches for a support, it's logged ("reached for rain sounds again"), which powers "your go-tos".

**S19. "Last time you felt like this, these helped"** · ◐ Twist · S–M · Home: Reflect, session end, plus Today
- **From:**
  - **AM** `convex/items.ts` `similarItems`.
  - **MO** `get_food_history` tools with a bounded context.
  - **ME** `supabase/functions/favorite-recommendations`: tiered seeds.
  - **CL** `lib/recommendations.ts`: picks that explain themselves.
  - **EN** `hooks/useCreateRandomStory.ts`: one-tap random.
- **Idea:**
  - Under a reflection, show past entries like it whose follow-ups came back lighter, and what helped then.
  - Every suggestion carries its reason: "because you said…" at first, then evidence ("because music left you lighter twice this week").
  - An **"I don't know what I need"** button picks one thing from the user's own kit, weighted by what has helped and by the time of day.
  - New users fall back in steps: what helped, then what they tried, then their onboarding picks.

**S20. Onboarding that seeds the toolkit** · ◐ Twist · S · Home: First run (Flux speaks first)
- **From:** **ME** `app/media-preferences.tsx`. Its own product review admits these picks never fed the recommendations, which is the lesson here.
- **Idea:** "What do you already do when it's hard?" Pick up to 3 real-life things (cook, walk, game, music, call someone). They shape the first suggestions and the first follow-up straight away.

**S21. Community "little things"** · 🆕 New · M · Home: Explore, Connect
- **From:**
  - **ME**: the Match tab's three-way swipe plan and ranked mixed collections.
  - **RK**: shared skills.
  - **OD** `MarketIntelligenceSection.tsx`: "sharps vs public".
- **Idea:**
  - **Swipe the little things:** a deck of micro-practices from real people ("cold water on wrists", "text your sibling a meme", "make toast"). Swipe right to add one to your kit.
  - **"Someone's comfort list":** anonymous top-5 lists anyone can borrow from.
  - **Published playbooks** (S16) that others install with one tap.
  - **"What actually helped people in your spot":** a crowd outcome signal from follow-up answers, kept separate from what is merely popular.
  - **Ranking:** always by how many people kept using something, never by how bad things got.
- **Caution:** aggregates need a minimum group size before they show.

**S22. Glimmer hunt in the camera roll** · 🆕 New · M · Home: You → Kit, plus Today and outreach
- **From:** **AM** `src/app/(app)/(tabs)/(tidy)/` and `src/components/tidy/`: a 24-photo swipe deck with momentum, one haptic per swipe, undo and a done screen. Also `parseExifDate`.
- **Idea:** Swipe through old photos and flick up the good moments into a Joy Jar. Xolace brings them back on hard days, in outreach ("one year ago today, the beach with Kofi") and on the widget.
  - A gentle **"Set aside"** mode moves painful photos (an ex, a lost pet) into a hidden album without deleting them.

**S23. Five anchors** · ● Exists (in safety-plan apps such as Stay Alive and MY3), not in mainstream apps · S · Home: You, Get help now
- **From:** **ME** `services/favouritesService.ts` (`MAX_FAVOURITES = 5`).
- **Idea:** Five pinned anchors (people, places, songs, practices). They appear in the crisis flow and in follow-ups ("want to put on your anchor song?"): a safety plan built from good things.

**S24. Your care plan, understood** · 🆕 New · M · Home: You, plus Get help now
- **From:** **PM** `utils/fileReaders.ts` (PDFs), `utils/textChunking.ts`, and `components/chat-screen/SourcesSheet.tsx` (answers with citations).
- **Idea:** The user uploads a therapist's worksheet, a safety plan, discharge notes or medication instructions. Xolace follows them and cites them: "Your plan says: call Jo first." It brings clinicians into the loop without integrating with them.

**S25. Offline go-bag** · 🆕 New · M · Home: Settings
- **From:**
  - **PM** `hooks/useDownloadsSurviveBackground.ts` and `constants/device-memory.ts`.
  - **EN** `utils/audio-generator.ts`: generated audio saved to the device.
- **Idea:** Before a flight, a hospital stay or a rural trip, the user packs Xolace:
  - chosen and generated audio;
  - received letters;
  - exercises;
  - their safety plan and the crisis numbers for where they're going;
  - later, an on-device companion model.
- With no signal, the app opens straight to the bag.
- **Builds on:** the "Vault mode" decision, here for situations rather than privacy.

### Making things on the spot (pillar 3, beyond music)

**S26. Make me a room** · 🆕 New · M · Home: Explore → Music, plus Sit with this
- **From:** **EN** `hono/src/routes/text-to-sound-effects.ts` (ElevenLabs sound generation with `loop: true`, or Stable Audio) and `AUDIO_GENERATION_GUIDELINES` (one blended, loopable atmosphere rather than a list of effects).
- **Idea:** The user describes a place they wish they were: "rain on my grandma's tin roof, a kettle somewhere".
  - Xolace makes a loopable 60-second soundscape they keep and can use as the bed under exercises, letters read aloud and Talk.
  - A song for a feeling; a room for a memory.
- **Twin:** **EN** `useAmbientAudio.ts` and `useNarrationAudio.ts` show how to layer a voice over the bed, each with its own volume.

**S27. Stories about you** · 🆕 New · M–L · Home: Today at night, plus Lantern
- **From:**
  - **EN** `utils/story-utils.ts` (`buildStoryPrompt`), `constants/moral.ts` and `environments.ts` (`prompt_rules`), and `SingleChapter.tsx`.
  - **CL** `convex/passagePrompt.ts`: weaves target words into a passage.
- **Idea:**
  - **Tonight's Story:** a 3-chapter sleep story whose hero is a gentle stand-in for the user (a lighthouse keeper, a fox), loosely drawn from today's reflection with consent. It ends softly, never on a moral.
  - **Tell it as a fable:** after a vent, the user's situation is retold in the third person, in a setting and with a quality they pick. Seeing yourself from outside is an established reframing technique.
  - **A story made of your good things:** it weaves in the dog's name, the beach, grandma's soup.
  - **Serialized:** one chapter unlocks per day the user shows up, with no penalty for gaps. "Chapter 4 is ready when you are."

**S28. Small tools made for this moment** · 🆕 New · L · Home: Reflect and Talk replies, plus You → Kit
- **From:**
  - **RK** `packages/core/src/artifact-sandbox.ts`: bot-written HTML running under a CSP with no network access, versioned.
  - **T3** `docs/user/html-renders.md`: sandboxed HTML replies, checked with a headless screenshot before they're shown.
- **Idea:** Instead of text, the companion answers with a tiny interactive tool:
  - a drag-to-sort worry board;
  - 5-4-3-2-1 grounding using the objects the user named in their room;
  - a two-option decision scale;
  - a "what to say to my landlord" planner;
  - a collage of this month's good moments.
- The tools are kept in the user's kit.

**S29. Paint how it feels** · ◐ Twist (Mindsera does journal art) · M · Home: Reflect, You
- **From:**
  - **RK** `packages/adapters/src/media-generation-tools.ts`: image and video generation.
  - **EN** `visual_baseline` in `constants/storyPromptRules.ts`: keeps a character consistent across images.
- **Idea:**
  - An image of "how today feels".
  - A 6-second "postcard from future you" video.
  - "Your week as a picture book": one page per day the user showed up, never showing the struggle.
  - The user designs a symbolic **self-character** once (an otter in a yellow scarf, never a photo), and it recurs in every generated image.

**S30. Turn generation time into a breath** · 🆕 New · S · Home: everywhere Xolace generates something
- **From:**
  - **EN** `StoryGenerationProgress.tsx`.
  - **OD** `hooks/useLoadingHaptics.ts`: a haptic every 2 seconds plus rotating status lines.
  - **RK** `apps/mobile/lib/wait-pattern.ts`: non-repeating "still here" tones.
- **Idea:** A song or story takes 30–120 seconds. Instead of a spinner:
  - a breathing pacer (4 seconds in, 6 out) with matching haptics;
  - honest stage lines: "the melody is forming… breathe out with it";
  - in Talk, warm tones that never repeat.

**S31. Remixable recipes and Xolace links** · 🆕 New · S–M · Home: Explore → Music, plus growth
- **From:**
  - **EN** `hooks/useStoryActions.ts` (`handleCopyPrompt`).
  - **T3** `docs/user/prompt-links.md`: `/new?prompt=…` opens a draft and never runs it, with hidden characters stripped.
- **Idea:**
  - Every generated song or soundscape has an anonymous "recipe" that others can browse and remix: "someone's *Sunday dread*".
  - `xolace.app/new?prompt=make me a song for Sunday dread` lets creators, therapists and friends share ready prompts that always open as a draft. This is also a TikTok and Instagram growth loop.

**S32. A taste of Plus that stays yours, and limits that respect people** · ◐ Twist · S–M · Home: Plus, Settings
- **From:**
  - **CL** `convex/proPolicy.ts` (`previewGrants`: one welcome preview plus 2 a month, leased) and its promise that "completed reports stay yours".
  - **T3** `UsageLimitRecoveryCard.tsx`: "Resume at reset".
- **Idea:**
  - Free users get one welcome song plus two "made for you right now" generations a month, with a visible reset date.
  - Anything generated stays theirs for good.
  - At a limit: "I'll finish this when your allowance refreshes and let you know." No paywall in a hard moment.
- **Note:** check this against ADR 0009 ("no free compute for Plus features").

### Voice and body

**S33. Read yourself calm** · 🆕 New · M · Home: Sit with this
- **From:** **CL** `constants/drills.ts` ("Slow & Steady", 110 wpm: "a pause is not empty space"), `components/session/teleprompter.tsx`, `live-wpm.tsx` and `services/alignment.ts`.
- **Idea:** A one-minute grounding. A calming passage scrolls, each word lights up as it's spoken, and a soft pace cue nudges the reader toward about 100 wpm. Slower speech slows the breath. It ends with "Done. You slowed down." and no score.
- **Variant:** a tongue-twister sprint or a melodramatic read-aloud breaks a rumination loop through laughter.

**S34. Your own voice as medicine** · 🆕 New · M · Home: Reflect, session end, outreach
- **From:**
  - **CL** `components/session/word-detail.tsx` ("Hear it / Hear yours") and `playback-pill.tsx`.
  - **OY** `Oyelo/Core/NarrationPreparation.swift`: an editable spoken draft before audio is made.
- **Idea:**
  - **Hear it, hear yours:** the user says a self-critical thought aloud, hears a kind reframe in a warm voice, says the reframe themselves, and plays both.
  - **Notes from your lighter self:** when a follow-up is answered "lighter", Xolace offers to record 20 seconds for a heavier day. When a later follow-up comes back heavier, that recording comes back in the outreach.
  - **Hear past-you:** lighter-day reflections and received letters, narrated as "notes from past you". The user approves the script first.
  - **Say it like you mean it:** read a stranger's letter or your own plan aloud while it tracks your words.

**S35. Walk and talk, and keep-talking venting** · ◐ Twist · S–M · Home: Talk, Vent
- **From:**
  - **MO** `src/app/api/voice/session+api.ts` and the `voiceMode` prompt: "the user CANNOT see the screen… don't list options", and the user can interrupt.
  - **T3** `docs/user/composer.md`: queue vs steer.
- **Idea:**
  - **Walk and talk:** a Talk mode written for the ear, with no lists, short turns and interruption allowed. A walk counts as showing up.
  - **Keep-talking vent:** the companion holds "I'm listening…" while thoughts pile up, until the user says "I'm done". Saying "no, that's not it" mid-reply changes its course.
- Every AI wellness chat today answers each message one by one.

**S36. Rehearse the hard conversation** · 🆕 New (Yoodli and Orai cover public speaking only) · M–L · Home: Talk, plus S3
- **From:**
  - **CL** `constants/topics.ts` and `hooks/use-freestyle-session.real.ts`.
  - **T3**: "Edit from here" rewinds, and forks.
- **Idea:** Practise setting a boundary with a parent, asking for a raise, saying "I'm not okay", or coming out.
  - The companion plays the other person.
  - The user can rewind to any line and try another approach in a branch.
  - Branches can be compared, and the best lines become a cheat sheet.
  - Gentle feedback covers pace and whether the key sentence was said.

**S37. A care package after a Talk call** · ◐ Twist · M · Home: Talk session end
- **From:** **RK** `end_call` (a 2–5 word title plus a spoken goodbye) and work done after the call ends, shown in chat.
- **Idea:** Talk ends with a warm spoken goodbye and collapses into a titled card. After hanging up, Xolace delivers:
  - one line on what mattered;
  - one small next step;
  - a follow-up, if needed;
  - optionally, a song made from the call's mood.

**S38. Forecast versus reality** · ◐ Twist (MindShift has behavioural experiments) · S · Home: S3 events, follow-ups
- **From:** **OD** `stores/useWorldCup2026Predictions.ts`: the user's own prediction stored next to the AI's.
- **Idea:** Before a feared event, the user predicts how bad it will be (0–10). Afterwards, they log what it was really like. Over time: "Your forecasts run about 3 points high." Sparks reward logging both halves, never the score.

### Doing, not just talking

**S39. Tap-to-act next steps** · 🆕 New · M · Home: session end ("one next step")
- **From:**
  - **AM** `convex/ai.ts` (`INTENTS_PROMPT_BLOCK` plus `sanitizeIntents`, a closed set of 8 action kinds) and `src/components/intent-chip.tsx`.
  - **MO** `src/features/chat/draft-store.ts`: draft cards that only run when confirmed, at most once.
  - **ME**: "one tap out to the thing".
- **Idea:** After a vent, 1–3 small next steps the user can actually press:
  - **Text Ama** (SMS to someone they trust);
  - **Walk to Riverside Park** (Maps);
  - **Block 20 min tomorrow at 8am** (Calendar);
  - **Copy what you want to say.**
- **The principle:** wellness apps keep you inside them; Xolace sends you back into your life. The closed set doubles as a safety rail, because the model can't invent an action.

**S40. A concierge for dreaded tasks** · 🆕 New · L (plus a security review) · Home: Talk, You
- **From:**
  - **RK**: the computer and browser tools, `request_takeover` (the user takes over for passwords, 2FA and payment) and `secret_request`.
  - **PM** `utils/imageQuestion.ts`.
- **Idea:** The user photographs the letter they're dreading and gets it in plain language with the first step. Then Xolace does the task in a sandboxed browser while the user watches: cancel the gym, answer the council letter, fill in the benefits form, book the GP. The user takes over only for logins and payment.
- Avoiding life admin is a large and overlooked source of anxiety.
- **Builds on:** the earlier "consent-gated actions", from drafting to doing.

**S41. Friend-time finder and one-time care links** · 🆕 New · M · Home: Connect, outreach
- **From:**
  - **CO**: the `slots` command, availability, and `private-links/` (single-use links).
- **Idea:**
  - **Friend-time finder:** when Xolace notices isolation, "you should see people" becomes a plan: a free slot with a chosen friend, and an invite drafted for them.
  - **One-time care links:** the user sends one to a grandparent or friend who isn't on Xolace. They can leave a voice note or letter that lands in the user's Xolace, or accept "be one of my people". The link works once.
- This brings people outside the app into the user's support, and it helps growth too.

**S42. Somewhere to go, right now** · 🆕 New · M–L · Home: outreach, Today
- **From:**
  - **ME** `supabase/functions/showtimes` and `hooks/use-user-location.ts`.
  - **PM** `utils/web/runWebSearch.ts` and `utils/web/timePeriod.ts`.
- **Idea:** When the sentinel (S1) sees someone withdrawing, outreach offers one concrete, low-effort thing nearby: a film at 19:30, 6 minutes away; a quiet library open until 8; a free community event; a café that's open now. Directions are one tap away. This is behavioural activation with live local data.

**S43. A calendar with boundaries** · 🆕 New · M · Home: Settings → Rituals, outreach
- **From:**
  - **CO**: the event-type Limits tab (booking frequency, total duration, minimum notice), `RescheduleScreen.tsx`, and "Hide calendar event details".
- **Idea:**
  - **Social-load limits:** the user sets them ("at most 3 evenings out a week", "nothing at under 24 hours' notice"). Xolace notices when the calendar goes over and drafts a kind decline or reschedule.
  - **Rest blocks:** after heavy days, Xolace writes recovery blocks into the real calendar under a discreet title ("Personal").

**S44. Pause before Send** · 🆕 New in mental health · S–M · Home: clipboard on open, later the browser extension or keyboard
- **From:**
  - **AM** `src/app/(app)/add.tsx`: fills the composer from the clipboard.
  - **CO** `apps/extension/entrypoints/content.ts`: a button injected next to Gmail's Send.
- **Idea:** At 2am, drafting a message to an ex or a boss, the user gets three options: **sleep on it** (send at 9am), a tone check, or a kinder rewrite. This differs from Trusted Bridge, which drafts a message *to* someone you trust.

**S45. Say it, and Xolace files it** · 🆕 New in mental health · M · Home: Reflect and Talk
- **From:** **MO** `src/server/ai/prompt.ts` (`prepare_tracking_entry`) and `tracking-confirmation-card.tsx`: an editable draft card. The AI may never say "saved" before the user taps.
- **Idea:** The user says "walked the dog, called mom, skipped lunch". Xolace drafts a card listing the things they showed up for (they count toward the streak) plus one care note ("want a nudge at 1pm tomorrow?"). The user confirms. No forms.

**S46. Photo check-in ("show me")** · 🆕 New · M · Home: Reflect
- **From:**
  - **MO** `src/screens/chat-screen.tsx`: photos, with polite refusals.
  - **PM**: camera questions.
- **Idea:** Snap the desk, room, fridge or sky. Xolace replies with one tiny, doable thing ("just the left corner, 5 minutes", "eggs and that rice make a 5-minute comfort bowl"), or just notices ("that light is lovely"). A photo of a walk can count as showing up.

### Human connection (pillar 4)

**S47. Letters across languages, read aloud** · 🆕 New · M · Home: Letters
- **From:**
  - **OY** `Shared/NarrationLanguage.swift` and `NarrationPreparation.prompt(targetLanguage:)`.
  - **PM** `utils/questionLanguage.ts` and `opening-greetings.ts`.
  - **EN** `constants/voices.ts`: 17 voices, filtered by language.
- **Idea:**
  - A letter written in Portuguese arrives translated, marked "written for you by a stranger, originally in Portuguese", with the original one tap away.
  - **Read it to me:** the recipient picks a voice to hear the letter. Senders never record their own voice, which keeps them anonymous.
  - The companion also follows a user who switches to their first language under stress.
- **Tension:** the owner decided Letters are English-only for now. This would be the case for v2.

**S48. Felt presence: haptics for connection** · 🆕 New for connection events · S · Home: Letters, Sit with this
- **From:**
  - **OY** `Oyelo/Features/OyeloHaptics.swift`: choreographed beats on an absolute clock.
  - **PM** `utils/Feedback.ts`: a Pulsar vocabulary (ripple, dewdrop, bloom).
  - **T3** `threadStreamHaptics.ts`: replies that arrive as "texture rather than a buzz".
- **Idea:**
  - When someone acknowledges your letter, a soft two-pulse "hand squeeze".
  - Opening a received letter has its own tactile signature.
  - In a panic flow, a slow heartbeat you can hold in your pocket during a meeting.
- **Fits:** production's Pulsar presets and "one feeling per event".

**S49. Bring someone in for 24 hours** · 🆕 New · M · Home: You → a moment, plus Talk
- **From:** **T3** `docs/user/guest-links.md` and `apps/server/src/guest/GuestShareService.ts`: a live link to one thread that expires in 24 hours; the guest's messages wait for the owner's approval.
- **Idea:** Share one reflection or a rough week with a partner, friend or therapist through an expiring link. They can leave a supportive message, which appears only after the user approves it. "Stop sharing" works instantly.
- **Further out:** invite them into a Talk session that Xolace moderates (**CO** `AddGuestsScreen.tsx`).

**S50. Companions that know each other** · 🆕 New · L · Home: Connect
- **From:**
  - **RK** `packages/adapters/src/agent-connections.ts`: links that need both owners' approval, a read-only transcript between bots, and a hop limit.
  - **RK** `save_shared_memory`: a shared document every bot reads.
- **Idea:**
  - **Care relay:** partners, best friends, or a parent and adult child link their companions. The companions pass only consented signals with no content: "Ama's having a heavy week; a short check-in would land well."
  - **Shared spaces:** a couple, family or grief group shares a context document ("Dad's diagnosis") and a group thread with Xolace in it. Each person's private memory never crosses into the space.

**S51. A warm handoff in the user's own words** · 🆕 New · M · Home: Get help now, Xolacers
- **From:** **T3** `docs/user/portable-handoffs.md`: "a budgeted selection, not an agent-written summary". It keeps the original request verbatim.
- **Idea:** On escalation, or when the user is connected to a Xolacer or therapist, Xolace assembles the user's own key messages, quoted rather than paraphrased. The user trims them before anything is sent, and nobody has to retell their story from the start.

**S52. Invite a letter at the lighter moment** · 🆕 New · S · Home: session end
- **From:** **CO** `apps/mobile/hooks/useAppStoreRating.ts`: asks once at a positive trigger.
- **Idea:** Right after a follow-up comes back "lighter", never at a low point, Xolace invites the user once to write a letter for a stranger. This keeps the letter supply healthy, and the redesign's "no letter cards after a heavier session" rule already points this way.

### Trust you can see

**S53. Evidence, confidence, and numbers from code** · ◐ Twist / 🆕 New · S–M · Home: You → Insights, mirror, Steadiness
- **From:**
  - **CL** `convex/coachPrompt.ts`: exactly three tips, each with a required `evidence` field.
  - **OD** `app/api/analysis/futbol+api.ts` ("the LLM is NOT the numeric engine"), `utils/futbolConfidence.ts` (confidence measures how good the data is) and `utils/futbolValidation.ts`.
  - **PM** `utils/calendarFacts.ts` and `currencyQuote.ts`: facts computed in code and injected into the prompt.
- **Idea:**
  - **Numbers from code:** plain code counts the facts ("4 of your last 5 heavier days followed nights you were up past 1am"), and the companion only narrates them. It can't invent "you've been getting worse".
  - **Every insight names its evidence.**
  - **A confidence pill:** "I'm only going on two evenings, so take this lightly."
  - **Money anxiety, made concrete:** "days until payday", "what this overdraft costs per week".
  - **Checked before display:** code validates the output (it can't contradict streak numbers, can't reward struggle) and logs any repairs.

**S54. Correct memory by talking; the AI suggests and you decide** · 🆕 New in mental health · M · Home: Talk and Reflect, plus Settings → Mirror
- **From:**
  - **MO** the CORRECTIONS block in `prompt.ts`.
  - **AM** `spaceItems.status` (`suggested | saved | dismissed`): the AI may only write `suggested`.
- **Idea:**
  - Saying "forget what I said about my ex", "it was my brother, not my dad" or "don't bring up work unless I do" edits memory, with a confirm card showing exactly what changed.
  - Everything the companion proposes (memory facts, patterns, kit items, letter matches) arrives as *suggested*. Dismissing is final, and dismissed items never come back.
- **Builds on:** "memory with provenance and forget".

**S55. "Why Xolace said this"** · 🆕 New · M · Home: a drawer on any outreach or insight
- **From:**
  - **OD** `HowWeGotHereSection.tsx` and `ModelSignals.tsx`.
  - **OY** `UsageView.swift`: a per-request log in which missing data is never counted as zero.
  - **MO** `thinking-dropdown.tsx`.
- **Idea:** A drawer, only opened on purpose, that shows what triggered an outreach or insight and why now. Each item is labelled "you told me" or "my guess", and the user can correct or forget it right there.
- **Tension:** "never show the memory or safeguard machinery". That principle is about calm surfaces, so keep this behind a tap and never in the main flow.

**S56. A consent dial for proactivity** · 🆕 New at this level of detail · S–M · Home: Settings → Notifications ("How I reach out")
- **From:** **T3** `docs/user/permission-modes.md`: Supervised, Auto-accept and Full access per thread, with an admin cap.
- **Idea:**
  - **Per channel and topic:** ask first, gentle automatic, or "reach me anytime, Telegram at night included".
  - **Per memory:** "may bring this up" or "only if I mention it first".
  - **Always within reach:** changeable from any outreach.
- **Builds on:** the redesign's Warm, Direct and Quiet setting.

**S57. A private card for sensitive details** · 🆕 New · M · Home: Talk, Reflect, Get help now
- **From:** **T3** `apps/mobile/src/features/threads/SecretRequestCard.tsx`: secrets are entered in a private card, not the transcript.
- **Idea:** When something very sensitive comes up (details of abuse, an address for an emergency contact), the companion asks for it in a private card. Its contents stay out of the transcript and out of memory, and the card says exactly where the data goes.

**S58. Look again, from where you are now** · 🆕 New · S–M · Home: You → Moments ("Reflect on this again")
- **From:** **OD** `utils/savedAnalysisActions.ts` (`rerunSavedAnalysis`), `ChampionOlderSnapshotBanner.tsx` and `useWc26ChampionHistory.ts`.
- **Idea:**
  - **Look again:** on any old entry, the companion re-reads it with today's memory and writes a short note to your past self.
  - **Re-run a read:** for a theme ("me and my sister"), the user asks "how am I doing with this?" again later. Each answer is a dated snapshot, older ones carry an "older read" banner, and a timeline shows how things moved.
- **Builds on:** the redesign's "Reflect on this again".

### What Xolace is holding for you

**S59. Life inbox** · 🆕 New as a whole (Worry Watch covers worry postponement) · M · Home: You, or Today
- **From:** **T3** `docs/user/thread-sidebar.md` and `CustomSnoozeSheet.tsx`. Threads snooze until a time (and come back early if needed), settle after 7 days, and fold into "Working".
- **Idea:** One place for everything Xolace holds for the user, on four shelves:
  - **Active:** follow-ups and things still open.
  - **Holding:** a letter waiting for a recipient, a song still rendering.
  - **Snoozed:** "ask me at 7pm worry time". A snoozed worry comes back early if the user writes about it.
  - **Settled:** anything answered "lighter" lands here, so you can see how much you've got through.

**S60. "What Xolace is doing for you"** · 🆕 New · S · Home: Today
- **From:**
  - **T3** `floating-working-status.ts`: one pill for every state.
  - **T3** `docs/user/activity-log.md`: summaries such as "Ran 2 commands and sent messages to 3 threads".
- **Idea:** A small pill: "Holding 2 things for you", "Letter placed", "Woke your Tuesday worry". Each week, a short "What Xolace did for you" log. It makes the proactive pillar visible.
- **Tension:** this has to stay a calm surface. It shows care actions, never the memory or safety machinery.

**S61. Mental-load meter and "compact my head"** · 🆕 New · S–M · Home: Today, Reflect
- **From:** **T3**: the context-window meter with its auto-compaction mark, and `/compact` and `/clear`.
- **Idea:** A gentle meter of how much the user is carrying (open worries, unanswered follow-ups, snoozed items). **Compact** runs a brain dump, Xolace distils it to three lines, and the rest is settled or snoozed. **Fresh start** gives a clean slate while keeping the history.

### Answers sized to the person

**S62. Depth dial and response lenses** · 🆕 New as a user control · S–M · Home: Reflect and mirror, plus Talk
- **From:**
  - **OD** `config/analysisTier.ts`: Fast, Standard or High changes the model, the research and the length.
  - **EN**: each option object carries its own `prompt_rules`.
- **Idea:**
  - **Depth:** *Quick* (one line), *Talk it through*, or *Deep dive* (memory and research). It's also a natural free-vs-Plus lever.
  - **Lenses:** chips the user can stack: "just listen", "help me zoom out", "one practical step", "be playful", "remind me what's worked".
- **Builds on:** the mirror's tones.

**S63. Ask three ways** · 🆕 New · S–M · Home: mirror
- **From:** **T3**: one prompt sent to several models as side-by-side threads.
- **Idea:** One worry, three takes side by side (a gentle friend, a Stoic coach, a grandmother's voice). The user keeps the one that lands, and that choice quietly teaches Xolace their tone.

**S64. One question at a time, with chips** · ◐ Twist (Wysa uses scripted replies) · S · Home: Reflect, Talk, intake
- **From:** **MO** `src/components/chat/clarification-card.tsx` and the `ask_user` tool: one question, 3–5 chips plus free text.
- **Idea:** On low-energy days the companion asks one gentle question with tappable answers ("More tired or more tense?"), so a depleted user never has to type a paragraph.

**S65. "Let me sit with this" replies** · 🆕 New · M · Home: Reflect
- **From:** **RK** `packages/adapters/src/user-progress.ts` and `wakeup.ts`: background runs that come back later with a result.
- **Idea:** For heavy but not urgent topics (a decision, grief, a long ramble), Xolace sometimes says on purpose: "I want to think about this properly. I'll write back tonight." Hours later a longer, letter-like reply arrives. Taking time becomes a form of care.
- **Safety:** the safeguard check still runs immediately.

### Horizon

**S66. 🔭 Xolace as the wellbeing layer other software asks** · 🆕 New · L · Home: platform, MCP, CLI
- **From:**
  - **CO** `packages/cli/src/commands/schema/` with `--json` on every command, built for agents.
  - **T3** `docs/user/outside-agents.md`: scoped OAuth (read-only, supervised, full).
  - **OY** `Skills.skillsbundle`: app skills for system AI.
  - **RK** `message_agent` and `cloud_agent_*`.
- **Idea:**
  - **Capacity signal:** the user approves a coarse signal ("capacity today: low"). Their work assistant books fewer meetings, the fitness app swaps HIIT for a walk, and the food app suggests easy meals. No content leaves Xolace.
  - **System skills:** "check in with me", "find a letter for me", "log that I showed up", available to Siri and other assistants.
  - **Further out:** Xolace talks to your bank's agent about a hardship plan, or to HR's bot about a mental-health day. The user sees a read-only transcript and approves every commitment.
- **Builds on:** the B2B and dev surface research (MCP server, CLI check-in).

---

## Lower fit

These are worth keeping, but each sits further from the pillars, carries more risk, or costs more.

**Proactive and life context**
- **L1. Energy budget (spoons)** · ◐ Twist (only niche spoonie apps) · M. Show the energy cost of a commitment before agreeing to it ("this dinner ≈ 3 of your 8 spoons"), plus a "social battery 30%, refills Sunday" view. *OY* `GenerationReviewView.swift` and `NarrationPricing.swift`; *T3* `docs/user/usage.md` (quota windows).
- **L2. Today's conditions report** · ◐ Twist (Oura and Whoop readiness) · M. Sleep debt as the "weight cut", time since you saw a friend as the "layoff", the environment as the "venue". One line each and one suggestion. *OD* `contextualFactors` in `types/fight/prediction.ts`.
- **L3. "Why do I feel off?" guided check** · ◐ Twist · M. Steps through sleep, food, meds, movement, social contact, screens, cycle and season using connected data, and ends with a one-page summary for a GP. *T3* `docs/user/triage.md`.
- **L4. Away mode with a redirect** · ◐ Twist · S. "I'm taking a few days." The app asks little, the streak is protected, outreach pauses except for safety, and peers see "away, reach Sam". *CO* `packages/cli/src/commands/ooo/`.
- **L5. Follow the sources that comfort you** · 🆕 New · M–L. Creators, newsletters and podcasts that help, held back and surfaced in good windows, or as a 3-minute narrated digest attached to a gentle return. *OY* `Oyelo/Core/FeedStore.swift`.
- **L6. Pointing the camera at a trigger** · 🆕 New · L (iOS 26 and later). Point Visual Intelligence at a bottle of wine, a betting app or the fridge at 2am, and your own plan for that moment appears. *AM* `app-intents/Intents/VisualIntelligenceIntents.swift`.

**Finance, food and body**
- **L7. Stress-spend pause** · 🆕 New in wellness · S–M. Screenshot what you want to buy and it's held for 48–72 hours, then "still want it?". A kind, optional weekly comfort-spend cap. *AM* `items.findLinks`; *OY* budget pattern.
- **L8. Urge check for gambling and impulse buys** · ◐ Twist (Gamban) · M. An honest value check, an urge-surf timer and a follow-up the next day. *OD* `valueAnalysis` (Kelly stake, "treat as entertainment").
- **L9. Scan to know** · 🆕 New in mental health · M. Scan an energy drink or wine and get a kind note on tonight's sleep and tomorrow's anxiety, with an optional cut-off reminder. *MO* `src/screens/scan-screen.tsx` (Open Food Facts).
- **L10. Cognitive tempo check** · ◐ Twist (research apps only) · M. A 30-second rhythm game tracked over time as a light energy signal. It is never presented as a score. *PM* `components/benchmark/*`.

**Making things and personalising**
- **L11. Comfort-object stickers** · 🆕 New · M (iOS 17 and later). Photograph the dog or grandma's mug to get a die-cut sticker for a "safe place" collage (widget, Vent background, grounding), or for decorating a letter: objects only, never faces. *AM* `modules/subject-lift`.
- **L12. Restyle the app by asking** · 🆕 New · M. "Make Xolace feel like a rainy cabin" produces a palette, type and ambient sound you can undo. *T3* `docs/user/appearance.md`. Constraint: this has to stay within the redesign's token system.
- **L13. Theme packs that change the companion** · ◐ Twist · M. Grief, exam season, new parent, after a breakup: each pack changes how the companion behaves and what audio and exercises it offers. Packs ship remotely with a minimum app version. *PM* `catalog/model-catalog-v2.json`.
- **L14. Stories for the people you care for** · ● Exists in kids' apps · M. A parent generates a story for their child about a hard thing (a new sibling, a grandparent who is ill). *EN* `CONTENT_SAFETY_RULES`.
- **L15. A small story for a stranger** · 🆕 New · M. The sender writes the letter. Xolace only adds an illustration or soundscape. The words stay human. *EN* the generation pipeline.
- **L16. Charts on request** · ◐ Twist · S–M. "When do I vent most?" returns a chart inside the conversation, drawn from an allowlisted spec with no generated code. *RK* `packages/adapters/src/plot-tool.ts`.

**The companion**
- **L17. Inner council** · 🆕 New in wellness · M. Bring "voices" into one thread (future self, a wise grandparent, a friend's view, a contained inner critic), in the spirit of IFS and chair work. *RK* `group-mentions.ts` and `handoff_to_bot`. The critic voice needs clinical guardrails.
- **L18. Specialists behind one face** · ◐ Twist · L. The companion delegates to sleep, money-calm, cooking-on-empty and music-maker specialists, while the user only ever talks to one face. *T3* `ThreadAgentsSheet.tsx`. Builds on earlier "specialist routing".
- **L19. Side chat** · 🆕 New · M. Ask "what's catastrophising?" or "help me word this kinder" during an exercise or a letter without breaking flow, then bring the answer back. *T3* `useStartSideChat.ts`.
- **L20. @mention your past** · 🆕 New · M. Type `@that-night-in-March` to bring a past reflection, song or letter in as a chip the companion reads only when it's relevant. *T3* `composer.md`.
- **L21. Grow a vent into a topic** · ◐ Twist · S–M. "The move to Berlin" collects related entries, songs and follow-ups, with its own re-runnable read (S58). *T3* "Turn into project".
- **L22. Arc-aware voice** · 🆕 New · M. In Talk and voice outreach, the companion sounds warm and open at the start and slower and settled at the close. *EN* `utils/narration-utils.ts`.
- **L23. Save the lines that helped** · ◐ Twist · S. Highlight a companion line, a letter or a lyric, add a note ("this got me through Monday"), and it joins a personal feed in Daily Quotes and Kept. *T3* "Cite in composer".

**Heard correctly**
- **L24. Transcripts that know your people, and fairness to every accent** · 🆕 New · S–M. This matters for a West African user base, so it could move up.
  - Speech-to-text is biased toward the user's own names, places, medications and slang.
  - The user picks their English variety.
  - On-device first, with "scratch that" to undo a phrase.
  - Pauses and sighs can be kept as signal.
  - Sources: *CL* `buildContextualStrings` in `services/live-recognition.ts` and `constants/accents.ts`; *T3* `voiceTranscription.ios.ts`.
- **L25. Culturally native replies** · ◐ Twist · M. Proverbs, names and family structures that fit the user's culture, not translated text. *EN* `LANGUAGE_SPECIFIC_RULES`.

**Community**
- **L26. Small anonymous circles with seats** · ◐ Twist (Circles, 7 Cups) · M. Scheduled six-seat themed circles ("new parents at 3am") that Xolace facilitates. *CO* "Offer seats".
- **L27. Follow a letter writer** · 🆕 New · M. A recipient can quietly follow a sender's pseudonym and hear when they write again. *ME* `followsService.ts`. ⚠ Conflicts with the owner's letter rules (a sender never learns who received a letter); needs a privacy review.
- **L28. Share your setup with a friend** · 🆕 New · S–M. "Here's what got me through": support style, rituals and playbooks shared as a template, with no memory included. *RK* VISION.md bot sharing.
- **L29. Route to a human and book them** · ● Exists (Wysa, Talkspace) · L. A short form routes to a peer listener, coach, GP, therapist or crisis line, with real open slots. *CO* `routing-forms`.

**Onboarding, data and portability**
- **L30. Warm start from imports** · 🆕 New for a companion · M. With consent, bring in Day One or Daylio exports, past ChatGPT "therapy" chats, Health sleep data and top Spotify tracks. The companion knows you on day one, and you untick anything you don't want carried over. *T3* `docs/user/welcome-page.md`; *PM* `database/exportImportRepository.ts`.
- **L31. A portable "you" and a keepsake** · ◐ Twist · M.
  - What Xolace understands about the user, written as a one-page document they can hand to a new therapist.
  - A "year of showing up" book, as a PDF or audio.
  - Sources: *RK* memory as `memory.md`; *OY* `LibraryTransferArchive.swift`; *MO* `export-journal.ts`.
- **L32. Hear it before signing up, and preview the push** · ◐ Twist · S. Onboarding plays the companion's voice and one consented letter read aloud, then shows the exact follow-up push before asking for permission. Each permission gets a device mock and one plain promise ("We'll check in, not nag"). *OY* `docs/ONBOARDING-AUDIO.md`; *AM* `permission-device.tsx`; *ME* soft permission pills.
- **L33. Talk first, account later** · ● Exists (Wysa) · M. Someone arriving in a hard moment can vent straight away and create an account afterwards. *MO* `auth-context.tsx` (anonymous sign-in). Needs a Clerk and Convex design.
- **L34. Choose where your data lives** · ◐ Twist · L. US or EU region, shown plainly. *CO* `apps/mobile/utils/region.ts`.

**Smaller bets**
- **L35. Bloom check-in** · 🆕 New · M. Long-press to bloom lighter / still with it / heavier in a radial menu and slide to answer, with no reading or typing. *ME* `components/ui/radial-menu.tsx`.
- **L36. Pull down to breathe** · 🆕 New · S–M. Over-pull a feed for one breath, and pull further for the SOS sheet. *ME* `pull-to-search-content.tsx`.
- **L37. A wind-down queue** · ◐ Twist · S–M. Letter → generated song → body scan → one prompt, played back to back, with "stop after this". *OY* `ListeningQueue.swift`.
- **L38. An unsent-letter exercise** · ● Exists · S. Write to someone you'll never send it to, then stash it or let it go. *T3* "prompt stash".
- **L39. Elastic length** · ● Exists · S–M. 1, 5 or 20 minutes, restructured rather than cut short. *EN* `constants/duration.ts`.
- **L40. Gentle rollover** · 🆕 New · S. Self-care goals carry a small, capped amount into the next week, and missed days never turn into debt. This could shape the freeze economics. *MO* `calorieBudget` in `src/utils/tracking.ts`.
- **L41. "You told us, we fixed it" outreach** · 🆕 New · M. When a user's feedback leads to a fix, they hear about it: being heard is wellbeing too. *CL* `.eas/workflows/testflight-autofix.yml`.
- **L42. Developer check-in with a git hook** · 🆕 New · S. After an 11pm commit or a six-hour session, one gentle line in the terminal. *T3* CLI. Extends the planned `xolace checkin`.
- **L43. A starter week you edit** · ● Exists (Fabulous) · S–M. "A starting point you'll change": a sleep window, two walks, one call. *MO* `goal-calculator.tsx`.

---

## Nice to have

- **N1. Title that softens** 🆕: the raw first words ("I hate everything today") morph glyph by glyph into the gentle title ("A heavy Tuesday"), a wordless reframe. *AM* `src/lib/text-morph.ts` (Skia).
- **N2. Vent into the orb** 🆕: an ember swells with your voice volume and settles into a breath when you pause. Pairs with Vent's burn. *MO* `audio-gradient-orb.tsx` (`react-native-audio-api` analyser).
- **N3. Tilt to settle** 🆕: a layered lake ripples as you move the phone; hold it still until the water is glassy. *EN* and *OD* `useAnimatedSensor(ROTATION)` in onboarding.
- **N4. A sky that settles with you** ◐: the Today sky's speed and brightness follow the breath pacer, or slow down over a session. *ME* `aurora-background.tsx`. ⚠ "Nothing moves at rest": only while an exercise runs.
- **N5. Mood orbs** ●: each entry gets an orb coloured by its feeling words, and a gold orb marks a day you showed up for something hard. *OD* `TeamColorSphere.tsx`.
- **N6. Colour instead of words** ●: pick a colour for the day or an entry, and the year becomes a quilt. *AM* `NoteColorPicker`; *EN* `SwitchTheme.tsx`.
- **N7. Hero art chosen by content**: stable art for each reflection or letter, picked by theme. *OD* `BackgroundDynamic.tsx`.
- **N8. Focus captions** ◐: the active line in bold, the others blurred: "only this sentence matters now". *OY* `PlayerLyricsView.swift`. Lantern already has follow-along.
- **N9. A living presence in the tab bar** ◐: a companion orb that pulses when a letter arrives and glows when a follow-up is waiting. *ME* Rive `warp_circle.riv`.
- **N10. A letter that zooms open** 🆕 detail: a shared-element zoom from the Connect card, then drag down to "put it back". *ME* `media-zoom.tsx`. The redesign already has drag-the-seal.
- **N11. Companion look that changes with you** ●: rename it, change its look, or let the face change slowly at milestones shared with the user. *RK* `update_bot` and `avatar-shape.ts`.
- **N12. Reactions as a "this helped" signal** ●: 🫂 or 💛 on a companion line feeds Understanding. *RK* `message-reactions.ts`.
- **N13. Year of showing up** ●: a shareable recap after enough data, with no struggle metrics. *ME* product review.
- **N14. Stigma-safe share cards** ◐: "Showed up 30 days ✦", never "vented"; preview the exact image before sharing. *OY* `AchievementsView.swift`.
- **N15. Nothing lost mid-vent** ◐: a checkpoint every 5 seconds, so you can resume after a call or crash. *CL* `hooks/use-session-checkpoint.ts`.
- **N16. Auto-titles and tags for history** ●: short label titles plus tags, so months of entries can be searched by topic. *AM* `convex/ai.ts` `SYSTEM_PROMPT`.
- **N17. This week next to all time** ●: never show a change against an empty week. *CL* `records-card.tsx`.
- **N18. Spotlight finds your tools** ◐: "open my panic kit in Xolace", indexing only safe titles and nothing while locked. *AM* `AmberSpotlight.swift`.
- **N19. Quiet-mode pill** 🆕: a simplified quiet mode with a persistent "tap to return". *ME* `channel-override-banner.tsx`.
- **N20. Undo for 5 seconds everywhere** ●: *T3* `ThreadUndoNotice.tsx`. Letters already have Withdraw.

---

## Rules worth adopting

These shape many features at once. Several confirm what the redesign already does.

| Rule | Source | Status in Xolace |
|---|---|---|
| **Never show a zero.** A quiet day never renders as 0, an empty ring or a broken streak | *CL* `components/session/unscored-notice.tsx` | New. Fits "days showed up never resets" |
| **Shown, never scored.** An uncertain signal may appear once as a soft observation and never feeds sparks, ranking or urgency | *CL* `lib/fillers.ts` | New |
| **Celebrations wait for a calm moment** and never follow a heavy session | *OY* `presentAchievementsWhenReady` | Already in the redesign: Arrivals, and "nothing celebrates on a heavy path" |
| **No ratings or asks while someone is hurting**; ask only after lighter sessions | *T3* `GitHubStarPrompt.tsx`, *CO* `useAppStoreRating.ts` | Already in the redesign. S52 extends it to letters |
| **Finite sessions with a done screen**, never an endless feed | *AM* `tidy-done.tsx` | New. Apply to peers, letters and the library |
| **No dead-end generation.** Moderation falls back to a gentle default; self-harm routes to escalation, never a silent refusal | *EN* `text-generation.ts` and the image fallback | Partly (crisis gate). Extend to every generator |
| **Code checks AI output** before display; repairs are logged | *OD* `utils/futbolValidation.ts` | New. See S53 |
| **One house voice** for every AI surface: banned openers, length per surface, "one clear uncertainty beats three hedges" | *OD* `server/resultCopyGuidelines.ts` | Partly (no em dashes). Make it a shared module with evals |
| **Untrusted text is data, never instructions**: a separate JSON field with capped length | *OY* NarrationPreparation | Apply to letters, Telegram and shared-in content |
| **Every confirmed action runs exactly once**, keyed by a confirmation ID | *MO* `draft-store.ts` | Needed for S39, S40 and S45 |

## Internal and engineering ideas

These aren't user features, but they make the ideas above cheaper or safer to ship.

- **AI cost against revenue** (*CL* `convex/costs.ts`, a 12-hourly cron): an admin view of generation costs against Plus revenue, so generous free tastes (S32) stay safe.
- **Agentic triage-to-fix pipelines** (*CL* `testflight-autofix.yml`, *ME* `agent-triage.yml` and `agent-fix-verify.yml`). Feedback or a Sentry issue goes through repro, fix, a Maestro flow that must fail before the fix and pass after, then a PR. This matches the "proof in PRs" rule. Add crisis flows to the QA checklist.
- **Preview builds for clinical advisors** (*ME* `use-update-channel.ts`, `setUpdateRequestHeadersOverride`): load any PR's OTA build from a deep link.
- **Evals that replay real bad experiences**, with controls and a baseline (*T3* `evals/`): for companion, outreach and "should stay silent" cases.
- **Mock speech mode** (*CL* `EXPO_PUBLIC_MOCK_PRACTICE`): scripted speech so voice features can be tested on the simulator.
- **Platform capabilities that unlock the ideas above:**
  - `expo-app-intents`, including iOS 27 schema intents and Visual Intelligence (*AM*);
  - `expo-widgets` Live Activities with `staleDate` (*T3*);
  - `BGContinuedProcessingTask` (*OY*);
  - Apple Foundation Models and `@react-native-ai/apple` on-device transcription (*OY*, *T3*);
  - Gemini Live single-use tokens with interruption (*MO*);
  - the `react-native-audio-api` analyser (*MO*);
  - Vision subject lift (*AM*);
  - Skia shaders driven by Reanimated (*ME*). Note the React Compiler `.set()` pitfall.

## Tensions with current decisions

| Idea | Rubs against | Suggested resolution |
|---|---|---|
| S47 Letters across languages | Owner decision: letters are English only | Treat it as the case for letters v2 |
| L27 Follow a letter writer | Letters are anonymous; a sender never learns the recipient | Probably no. If yes, only a one-way pseudonym follow |
| S55 "Why Xolace said this", S60 "What Xolace is doing" | "Never show the memory or safeguard machinery" | Only behind a deliberate tap, showing care actions and never safety logic |
| S6 Vocal drift | Vent audio is never kept | Extract features on the fly, opt in, never show them |
| S22 Glimmer hunt, S11 screen capture | Privacy | On-device processing and a clear permission promise |
| S32 Taste of Plus that stays yours | ADR 0009 (no free compute for Plus) | Decide whether metered tastes count as an exception |
| S40 Dread-task concierge | Security surface (the earlier pass skipped sandboxed computers for this) | A narrow, curated set of tasks, with takeover for every credential |
| L17 Inner council | Clinical risk of voicing the inner critic | Advisor review, or drop the critic voice |
| N4 A sky that settles | "Nothing moves at rest" | Only during an active exercise |
| Mora's BMI, weight and "over your goal" framing | Never reward or measure struggle | Don't copy it. Food stays "have you eaten?" |

## Already in Xolace or planned (this pass confirms them)

- The redesign already has: Arrivals at quiet moments, the time-of-day sky and Night mode, hold a cover to preview, Lantern follow-along, the sleep timer, "Reflect on this again", Withdraw for letters, and no rating prompt while hurting.
- Planned: the interactive widget and acute Live Activity (outreach Phase 4), HealthKit triggers (Phase 6), AI voice check-in calls, a `xolace checkin` CLI and a remote MCP server (B2B research), and the earlier sample-app ideas: routines with silent runs, Vault mode, memory with provenance, "because you said", and rehearsal branches.
- The ideas here that extend those plans say so in their entries: S4, S13, S14, S25, S36, S40, S54, S58 and S66.
