# Kindling launch video: the flow from clarity to support

**For:** the agent producing a ~15-minute motion product/launch video for Kindling.
**As of:** 2026-10-15. Taken from the shipped code, not the spec. Where `docs/paths-v1.md` and the code disagree, this doc follows the code (noted inline).
**Status:** everything in the story below is `Shipped`. Things that aren't are listed in §6. Don't put them on screen.

---

## 1. The one idea the video has to land

> **Xolace gives you clarity first, then support picked for what you just said.**

Xolace has three layers (`docs/foundation/xolace-for-agents.md`):

| Layer | Job | In this video |
|---|---|---|
| **The Fire** | Reflect and understand | Act 1: write, get mirrored, done |
| **Kindlings** | Support | Act 2–3: a small bundle of support steps made from that session |
| **The Hearth** | Bring people back | Act 3: the notification and the Today card bring you back to tend it |

Brand image: **the campfire.** The fire is the AI. It lights things up, but it isn't who you came to meet. Kindling is what you feed the fire: small twigs, tended one at a time. The video's visual metaphor is already in the product. A winding trail of twigs leads down to Flux's campfire.

**Mascot:** Flux, a small soft-vinyl flame-shaped toy (peach face, pastel-rainbow gradient, glossy black eyes, mitten hands). See `docs/kindling-flux-poses.md` for the full character prompt. Assets: `assets/images/flux/`.

---

## 2. Vocabulary (use exactly this on screen and in VO)

| Say | Never say | Why |
|---|---|---|
| **kindling** (the bundle) | "path", "plan", "program" | "path" is an internal code word only (ADR 0008) |
| **twig** (one step), or "a few small things" | "task", "exercise plan", "treatment" | |
| **tend / tended** | "complete", "finish your plan" | Matches the UI ("2 of 4 tended") |
| **the mirror** | "AI therapist", "chatbot", "diagnosis" | The mirror reflects. It doesn't prescribe. |
| **Xolacer** | "counsellor", "therapist" | Trained volunteer peers. Don't upgrade the claim. |
| **Xolace+** | "premium", "pro" | Kindling is Xolace+ only |

**Tone rules** (these are the product's own rules for twig copy, so follow them in VO too): second person, present tense, plain. **No clinical words:** *anxiety, symptoms, cope, regulate, grounding, manage, heal, fix, cure.* **No outcome promises.** Say what a thing *is*, never what it'll *do to you*.

---

## 3. The flow, beat by beat

Each beat lists what's on screen, the exact UI copy, the motion that's already in the code (so the video matches the app), and what happens behind it (for optional explainer overlays).

### Act 1: Clarity (The Fire)

**Beat 1. Compose: "What's on your mind"**
- Screen: the reflect home. A morphing card with Flux perched on top (`flux-perch.tsx`, "Flux, leaning on the card"). Placeholder: **"Start typing..."** (when dictating: **"I'm listening..."**).
- Texture band under it: **"Or just tap what feels close:"**, then word pills in four sets, *Flat · Tender · Bright · Charged* (e.g. heavy, foggy, numb · aching, hollow · warm, hopeful · racing, on-edge, wound up). Up to 4 words.
- Motion: Flux *settles onto* the card. He doesn't pop in.
- Story job: low friction. You can type a paragraph, or just tap "heavy" and "racing".

**Beat 2. Processing**
- Rotating lines: **"Taking this in..." · "Sitting with what you shared..." · "Finding the words..." · "Feeling into this..." · "Sensing what's here..."**
- Behind it (overlay-safe, in plain words): three things run at once. A **safety check**, an **understanding** step (what you're feeling, how strongly, what themes, and whether you could use support), and a look back at what you've shared before. Then the mirror gets written.

**Beat 3. The mirror**
- Screen header: **"The Mirror"**, with optional play-audio (the mirror can be read aloud).
- The mirror lands right the first time. Tap **"That's it"** to move on. (The row also has other options. Keep them out of frame or out of focus. The video shows one straight flow.)
- Story job: *this is the clarity moment.* Someone reads back what you meant, in better words than you had.

**Beat 4. Where to from here?**
- Flux holding a map. Heading: **"Where to from here?"** Three cards:
  - **Sit with this**: "A quiet space to breathe" (Flux at the campfire)
  - **You're not alone**: "See what others have shared" (two Fluxes listening)
  - **I just needed to say it**: "Return to the beginning" (Flux whispering)
- This is the free, immediate next step. **It is not the kindling.** Don't blur the two.

### Act 2: The hand-off (Fire → Kindling)

**Beat 5. The kindling announcement** (`kindling-announcement.tsx`)
Shows only when the session **qualifies** (the understanding said this person could use light or active support) and safety isn't elevated.
- Visual: a cluster of six Flux poses in tinted circles with partial coloured rings, on a soft radial glow. One pose per twig kind: breathing, audio, music, Xolacer, read, bridge.
- Eyebrow **"Your kindling"**. Title (serif): **"We're gathering a few things for you"**
- Xolace+ body: *"Small support steps for after this, something to breathe with, hear, read, or share. It'll be waiting when you're done."* → **Continue**
- Free body: *"Xolace+ gathers a kindling after sessions like this one, small support steps, picked for what you brought."* → **Get my kindling with Xolace+**
- **Skip** top-right.
- This is the video's hinge shot. Hold on it.

**Beat 6. Session end: "Setting up your kindling…"**
- Xolace+: a flame tile with **"Setting up your kindling…"** and *"What next? Check back soon on the discovery screen for the curated support actions for you."*
- Free: a lock tile with **"Turn this into kindling"** and *"Xolace+ carries today into what's next. Tap to see how."*
- Behind it (overlay-safe): in the background, one model call picks **4 support steps** from a **human-curated catalogue** and writes one line per step saying *why this, for you*. It **doesn't invent support.** It chooses from what people have reviewed. Each step is then matched to real content (a specific track, a specific reading, a Xolacer specialty). If fewer than 3 steps hold up, **nothing ships**: no notification, no filler kindling. (Code: picks `MAX_TWIGS = 4`, ships if ≥ `MIN_TWIGS = 3`. The spec's "≥ 2" is outdated.) One kindling per person per day.

### Act 3: Support (Kindlings, brought back by the Hearth)

**Beat 7. The notification**
- Push copy, verbatim: **"Your kindling is ready — a few small things picked for you."**
- It only fires *after* the kindling exists. It's held back if the person hasn't been around in 30+ days, or if a safety follow-up is still open.

**Beat 8. The Today card** (Discovery tab)
- Card: **"Your kindling"**, *"0 of 4 tended; a few things from your last session."* with artwork on the right.

**Beat 9. The kindling screen: the trail** (the hero screen)
- Large title **"Your kindling"**, **Dismiss** top-right.
- Sub-line: *"A few things to try, from what your last session held."*
- Progress: **"N of 4 tended"** + a segmented bar. Segments fill **ember** when tended and go grey when skipped.
- **The trail:** a stop per twig, alternating right/left, joined by a winding line of **marching dashes** (they loop every 1.6 s) down to **Flux's campfire** at the bottom (`flux-campfire.png`). Each stop is a round Flux pose with a signpost label (eyebrow + title).
- Motion from code: stops fade/scale in **staggered** (120 ms + 80 ms per stop, 360 ms ease-out). The selected stop scales to 1.06. Tended stops get an ember halo, ember ring, check badge and a "Tended" eyebrow with a small flame, and the trail turns **solid ember** up to the last tended stop. *So the trail lighting up toward the fire is the progress.* That's the money shot.
- A floating card at the bottom shows the open twig: eyebrow, title, the **why** line, then **"Not for me"** (left) and the primary action (right).

**Beat 10. The six twig kinds** (show 3–4, the way a real kindling does)

| Twig | Eyebrow | Title | Button | Opens |
|---|---|---|---|---|
| Breathing | A few minutes | Sit with this | Begin | Sit-with-this exercise |
| Support audio | Something to hear | *(track title)* / A voice for this | Play | Player |
| Music | Something to hear | *(track title)* / Low sound for the quiet | Play | Player |
| Xolacer | When you want it | Someone who has been here | See who | Connect roster filtered to a specialty |
| Read (Lantern) | Something to read | *(entry title)* / A few pages for this | Read | Library reader |
| Trusted Bridge | When you're ready | Tell someone you trust | Write | Trusted Bridge share |

- Audio/music twigs also have **"Browse more like this"**, which opens the Browse tab for that topic (Browse is a bottom tab: Support audio · Music · Topics).
- **Why line example** (illustrative, written to the product's rules, not real output): *"You said the evenings are the loudest part. This is twelve quiet minutes of someone talking it through."* One sentence, it names something the person actually said, and it promises nothing.

**Beat 11. Tending**
- Tap **Begin/Play/Read/See who/Write** → that screen. Finishing it (the exercise completes, the track plays to the end, the entry is read, a share is sent, a Xolacer request goes out) **tends** the twig. You come back to the trail lit one stop further.
- Steps go in any order. The order is a suggestion, not a gate.
- **"Not for me"** → stop dims, title struck through, label **"Passed by"** / card **"Not for you"**. That's a real signal, not a failure. Show it once, kindly.
- **Dismiss** → *"Put this kindling out?"* / *"Anything you haven't tended stays untended. A new one comes with your next session."*
- Empty state (nice closing frame): leaf glyph + *"When a session leaves something to sit with, a little kindling shows up here."*

**Beat 12. The loop closes**
Tomorrow you reflect again → a new kindling replaces the old one. Daily, small, like skincare. Tagline: **"Skincare for your mind."**

---

## 4. Suggested 15-minute structure

| Time | Chapter | Beats |
|---|---|---|
| 0:00–1:00 | Cold open: the fire on the trail, Flux, the line "clarity first, then support" | 9 (teaser) |
| 1:00–2:30 | The problem: you feel something, you can't name it, help arrives too late or too generic | — |
| 2:30–5:30 | **Clarity**: compose, textures, processing, mirror | 1–3 |
| 5:30–6:30 | Next step | 4 |
| 6:30–8:30 | **The hand-off**: announcement, "Setting up your kindling…", how it's chosen (curated catalogue, why-lines, nothing invented) | 5–6 |
| 8:30–9:30 | Coming back: notification → Today card | 7–8 |
| 9:30–12:30 | **The trail**: tour each twig kind, tend two, pass one, watch the trail light up | 9–11 |
| 12:30–13:30 | Safety and care (see §5): kindling steps aside when it should; Xolacers and Trusted Bridge as the human end | — |
| 13:30–14:30 | The daily loop, Browse as the open shelf | 12 |
| 14:30–15:00 | Close: "Skincare for your mind." Xolace+ end card | — |

---

## 5. Claims: what's true and safe to say

Say these freely (all literally true today):
- Kindling is made **from your session**, after the mirror, in the background.
- Support is **chosen from a human-reviewed catalogue**. The AI picks, it doesn't invent.
- Each step comes with a **one-line why** tied to what you said.
- **3–4 steps** (in practice 4; it ships nothing rather than ship filler).
- Steps go in **any order**. You can pass on any of them.
- **At most one kindling a day.** A new session replaces the old one.
- **Kindling is Xolace+.** The mirror is free, always.
- When a session shows real risk, **kindling steps aside** and safety leads. (Crisis forces support need to none.)

Don't say:
- Anything clinical, diagnostic, or outcome-based ("reduces anxiety", "evidence-based therapy", "heals").
- That Xolacers are professionals, or that Xolace replaces therapy. Xolace gets people to outside care **sooner**. It never stands in for it.
- That kindling "learns from what you tend" (not built, see §6).
- Privacy promises beyond: reflections are private by default, you can delete everything.
- Never show real user text. Write sample reflections and mirrors that sound real, and mark them as illustrative in the brief.

---

## 6. Not shipped. Keep it off screen

`Building`/`Planned`: steadiness tracking, compounding detection, full insights, learning from twig completions, routed Vent as a twig, the "Vessa" audio brand name in UI, clinical care, past-kindlings history, Browse search, "recommended for you".

---

## 7. Source files (for screen captures and exact behaviour)

| What | Where |
|---|---|
| Compose / textures | `src/features/reflect/compose/`, `src/features/reflect/texture-sets.ts` |
| Processing, mirror, next step | `src/features/reflect/components/states/` |
| Announcement | `src/app/(protected)/kindling-announcement.tsx`, `src/features/kindling/components/kindling-announcement-screen.tsx`, `pose-bubble.tsx`, `announcement-poses.ts` |
| Session-end slot | `src/features/session-end/components/kindling-close-slot.tsx` |
| Today card | `src/features/discovery/components/kindling-today-card.tsx` |
| Trail screen | `src/features/kindling/components/kindling-screen.tsx`, `kindling-trail.tsx`, `trail-stop.tsx`, `twig-sheet.tsx` |
| Twig copy + routing | `src/features/kindling/twig-presentation.ts` |
| Generation / notification | `convex/ai/paths/generate.ts`, `prompt.ts`, `catalog.ts`, `notify.ts` |
| Design spec / rules | `docs/paths-v1.md`, `docs/foundation/xolace-for-agents.md`, `docs/kindling-flux-poses.md` |
| Flux art | `assets/images/flux/` (campfire, map, pair-listening, whisper, writer) + pose URLs in `announcement-poses.ts` |
