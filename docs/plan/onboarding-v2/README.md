# Onboarding v2: design reference

Design source for the one-answer intake ("A · Talk to Flux") and the Xolace+ first impression
("I · Same week, two ways"). Spec and decisions: #704. These files are the prototypes the
spec was written from; rebuild them properly in the app, don't port the prototype code.

The interactive versions live on a private Design canvas
(https://claude.ai/artifact/1RjyxfX1LgcjudNZ3hvdnX). Ask its owner for access. The files here are
the same boards as source.

## Files

| File | Board | What it holds |
|---|---|---|
| `a-talk-to-flux.dc.html` | A · Talk to Flux | Every intake v2 screen, its copy, and the client state machine |
| `i-plus-same-week.dc.html` | I · Same week, two ways | The Xolace+ screen: Free / With Plus switch, three cards, plans, Talk demo |
| `flux-live.dc.html` | Live Flux | The five Flux moods and the per-voice tints |
| `question-map.dc.html` | Where every question goes | Each v1 question and where it moves, or why it's cut |

They are Design-canvas components (`.dc.html`). They need the canvas runtime (`support.js`) and
render blank as plain HTML. Read them as source: the markup is the layout and copy, the
`renderVals()` script is the state and data.

## A · Talk to Flux

Screens, in order (from the prototype's state machine):

| Step | Shows | Leaves to |
|---|---|---|
| `ask` | Flux talking while "Hey, I'm Flux. Before anything else… what's been sitting with you lately?" types out; then three quick replies, a "Tell Flux anything…" field with a mic, and Skip | `listen`, `type`, `interpret` (quick reply), or `name` (Skip) |
| `listen` | Flux listening, timer, live transcript, stop button | `interpret` |
| `type` | The same question, a text area, "Send to Flux", "Talk instead" | `interpret`, `listen` |
| `interpret` | Flux thinking; "Hearing "<their first words>…"", "Noticing <topics>…", "Getting the fire going…" | `heard` |
| `heard` | "Here's what I heard. Tap anything that's off." The quote they came from, then chips in three groups | `name`, or `listen` ("Say it again") |
| `name` | Flux happy, prefilled camper name, dice to reroll, "Keep it" | the Xolace+ screen, then the Mirror |
| Mirror | "Ready when you are, <name>." and "Pick up where you left off" with their words | |

Chip groups map to intake fields:

| Group | Field |
|---|---|
| Why you came | `intent` |
| Weighing on you | `weighingOn` |
| How you put it | `disclosureStyle`, `emotionAwareness` |

- The prototype reads the answer with keyword rules (`infer()`). That's a stand-in for the model
  call in #704, not the logic to build.
- Not in the prototype, but specified in #704: the single follow-up question, the safety route
  on an elevated or crisis answer, and the pick-list fallback when reading fails.
- The line "Flux keeps the words, never the audio" ships only if transcription really drops the
  audio (open question in #704).

## I · Same week, two ways

- **Header:** "Same rough week. Two ways it goes." with Flux top right (grey and resting on Free,
  in full colour and happy on Plus).
- **Switch:** Free / With Plus over three moments. The Free side is one short line each; the
  Plus side is a benefit line plus one visual.

| Moment | Free | With Plus | Visual |
|---|---|---|---|
| Tue night · "Work won't leave your head." | "You type it once and the Mirror names it." | **Talk it out before it's named.** | A voice-note bar (play button, waveform, "Try it") that opens the Talk demo |
| Thu night · "You know what it is. Now what?" | "The Mirror says it's guilt. Then you're on your own with it." | **Get support, not just a name.** | The named feeling ("guilt") held by a dashed arc of three supports: Sit with it, A soft sound, A Xolacer |
| Sun night · "Why does this keep happening?" | "You can tell it's been heavy. Not what's building, or since when." | **Catch what's compounding.** | Three steadiness rings (Work & Studies ember "Heavier lately", Health & Rest "Steady", Love & Friendship "Easing") and a "heavier than your usual for 3 weeks" line |

- **Rings:** follow Insights: open-bottom arc, the life-area icon in the gap, colour is state,
  never domain.
- **Example data:** ring values and "3 weeks" are examples. The production card must be labelled
  as one.
- **Bottom of screen:**
  - On Free: "See it with Plus →", "Saying it stays free.", "Continue free".
  - On Plus: "Start my free week", the price line, "Continue free".
- **Plans:** the prototype only shows `[YEARLY PRICE]` placeholders. #704 has the plan rules:
  yearly preselected with the free week, monthly showing any live discount, RevenueCat prices.
- **Talk demo:**
  - **Opening:** "Before the Mirror names it, talk it through with me. I'll ask, you answer, and we
    get underneath it together. Try me."
  - **Voices:** a voice picker (Sage, Wren, Vesper, Ash).
  - **Exchange:** one user line, one reply that asks a deeper question instead of naming the
    feeling.
  - **Ending:** "Keep talking · 7 days free" or "Back to the week".
  - **Sample lines:** the user line and reply in the prototype are examples.

## Live Flux

The prototype draws Flux as one SVG so the moods could be tried quickly. In the app, build them
on the existing Skia + Reanimated Xolace face (`features/xolace-face`, see
`docs/plan/xolace-face-placements.md`).

| Mood | Used on | Motion |
|---|---|---|
| idle | `ask` after the question has typed out, `type` | Slow bob, blink every ~4 s, small smile |
| talking | `ask` while the question types, the Talk demo reply | Mouth opens and closes, slight squash |
| listening | `listen` | Leans in, eyes a little bigger, sound rings pulse out |
| thinking | `interpret` | Eyes up and to the side, three thought dots |
| happy | `heard`, `name`, the Plus side of I | Closed happy eyes, open smile, small bounce |

Tints follow the Talk voices: Flux default, Sage green, Wren warm peach, Vesper violet, Ash cool
grey.

## Colours

The prototypes use hex values taken from the app's tokens. In the app use the CSS variables
only (apps/mobile AGENTS.md: never hex).

| Prototype | Token |
|---|---|
| `#07060C` | `--background` (dark) |
| `#ECEBF3` | `--foreground` (dark) |
| `#A7A5EB` | `--accent` (lavender) |
| `#E8AA4E` | `--ember` |
| `#0B0716` | `--color-plus-night` |
| `#B4B2C6`, `#8F8DA3` | `--muted` text; picked lighter than the token's base so small text passes 4.5:1 on the dark ground |
