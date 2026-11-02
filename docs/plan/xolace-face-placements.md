# Xolace face: where it goes

Decisions from prototyping the animated Xolace face (Skia + Reanimated) in the mobile app.
The prototypes live on the throwaway branch `proto/xolace-face` only; they are the primary
source for what each option looked and felt like. Rebuild the winners properly when
implementing; don't promote the prototype code.

The shared face itself is built: `apps/mobile/src/features/xolace-face/` (`XolaceFace`,
`useFace`, the poses). Each placement below builds on it.

## Ground rules

- **One fixed Xolace face across the app.** Wherever the face is giving feedback (the mood
  check-in, steadiness, Reflect), it is always the same face, so a worried look always means
  the same thing. The customisable companion (name, voice, look) lives only in Talk.
- **Never on crisis screens.** Escalation, crisis resources and the "heavier than a regular
  tough day" screens stay plain. A face reacting to someone in crisis can read as mockery.
- **Heavy is warm concern, never crying.** The face never mirrors sadness at full strength.
- **Steadiness isn't happiness.** The steadiness face changes how restless it is, never its
  expression.

## 1. Post-mirror "How do you feel now?": variant B

`session-end/components/activity-variant.tsx`, mood phase. Replaces the four pills.

- One slider from **heavier** (left) to **lighter** (right), with the face above it
  reacting live as you drag (`poseForCheckIn`).
- The centre snaps to **the same** (a soft haptic), with a tick at each end.
- Each half has **5 steps**, each with a haptic tick. The status word follows them:
  "a little heavier", "heavier", "much heavier" (and the same for lighter).
- **Sparkle eyes** from "lighter" (step 3) up; "a little lighter" keeps the plain eyes.
- **Not sure** is a quiet text link under the slider, not a point on it. It opens the
  "not sure" sheet straight away (unchanged from today).
- The face, status word and slider fill the space between the header and the button, so
  the face sits lower and larger.
- **Continue** is the app's themed `Button` (`components/shared/playful-button`): the raised
  lip in Playful, the theme's normal filled button elsewhere. It reads "Skip for now"
  (secondary) until there's an answer, then "Continue" (primary).
- **The heavier follow-up opens on Continue**, not when you let go of the slider. The drag
  depth is the intensity (1–5), so the sheet **skips the flame step** and opens on the
  question and chips for that intensity (buckets: ≤2 low, 3 mid, ≥4 high). Closing the
  sheet, answered or not, moves on to the next step, so the answer can't be changed after.

**Backend (store-gap safe).** The slider still saves one of
`"lighter" | "same" | "heavier" | "unsure"`. The exact position can go in a new
**optional** number field (`moodPosition`, 0 heavier … 1 lighter), an additive change old
builds ignore.

Not chosen:
- **A**: same slider, but "heavier" then asks the flame-intensity question, which is one
  more step for someone already feeling worse.
- **C**: you drag the face itself along the line.

## 2. Steadiness dial: variant A

`insights/overall-dial.tsx`.

- The face sits **inside the tick fan**, so the dial is its halo. The number sits small
  under the face (`56/100`).
- Steadiness drives **calm vs restless** motion only: a lower score means more fidgeting
  and wider eyes. The mouth never changes with the score (`poseForSteadiness`).
- **Before two domains are unlocked**: a calm, waiting face (soft, half-lidded eyes) sits
  in the empty fan, with the shorter line "Lights up once Xolace knows two parts of your
  life."
- One face only: no small faces on the domain rows.
- **An info button** at the top right of the card opens a native `formSheet` sized to its
  content (like the report sheet on the anonymous cards; iOS 26 gives it the glass
  background). It's titled "Reading the face" and each row has a small live face showing
  what it describes:
  - **Restless**: it fidgets and sways; the more it moves, the less steady the last few
    weeks have been.
  - **Settled**: as things steady, it settles and keeps still.
  - **Waiting**: before two parts of life are known.
  - A note: its expression never changes with the score; steadiness isn't happiness.

Not chosen:
- **B**: the face as the hero, with the number moved under the dial.
- **C**: today's big number, with a small face riding the tip of the lit ticks.

## 3. Reflect: variant B, nod by the label, orb kept

`reflect/compose/morph-card-header.tsx` (the presence dot) and
`reflect/components/states/mirror-state.tsx`.

- **Composer (B): the face replaces the presence dot** in the header row, at 40px. It stays
  small; the writing is the focus.
- **Its eyes follow the end of your last line**, measured from an invisible copy of the
  text laid out like the field (so it knows where the line really ends and when it wraps).
  Pause for about 1.4s and it looks up at you; typing again sends it back to the words.
  Before you write, it looks across at the prompt.
- **It leans in as you write more**: one step per ~40 characters, up to 6, from the
  attentive pose (lean, a little brow lift). Per few lines, never per keystroke.
- At 40px the prompt beside it wraps sooner (often to two lines); that was accepted.
- **Processing keeps today's `ThinkingOrb`.** No face on that screen.
- **Mirror: a small face (30px) beside "The Mirror" label.** It arrives in the thinking pose
  and, once the swap from processing has settled (~450ms), gives one gentle nod into the
  soft `nod` pose (warm, not a grin; mirrors are often about something heavy).
- Never on the escalation screen.

**Flux stays.** The resting card's mascot, Flux, still fades into the header as the card
opens, and the Xolace face takes the presence dot's place from there. One flow shows two
characters; that was accepted over variant C (the face takes Flux's perch and travels into
the header).

Not chosen:
- **A**: a 28px face in the dot's place, no lean. Quieter, but too small to read.
- **C**: the face takes Flux's perch on the resting card and travels into the header.
- **Thinking face on processing**: a 150px face whose eyes drift while the lines change.
- **Nod above the label**: a 56px face above "The Mirror".

## 4. Talk: a voice-and-look sheet (entry A), the face in the header, two views

`talk/consent-card.tsx`, `talk/talk-header.tsx` and `talk/talk-screen.tsx`. This is where the
customisable companion lives: its name, voice and look make one profile.

- **The voice chips leave the consent card.** A **"Voice and look" row (A)** sits above
  Start: a small voice orb, the voice's name, a chevron. It opens a sheet; the card is
  otherwise unchanged.
- **The sheet** (after Claude's voice settings) holds everything you set before a talk,
  titled "{name}'s voice and look", with a glass close button at the top left:
  - **Voices as orbs** in a horizontal carousel that snaps one voice to the centre. Each orb
    is a dark circle with three blurred, slowly turning colour blobs (from the colours-app
    sample), one palette per voice (Ash warm orange, Sage green, Vesper indigo, Wren pink).
    Side orbs shrink and fade; a light haptic ticks as each voice passes the centre.
  - **Landing on a voice picks it and plays its sample**; the orb and a ring behind it swell
    with the audio level. Tap the centre orb to stop or hear it again; tap a side orb to go
    to it. The description and the dots under it always follow the saved voice. There is no
    "Auto" orb: unpicked, the carousel centres on the voice a talk would use (the mirror
    voice, else Vesper).
  - Then **Look** (the preset looks as tiles: Xolace, Tide, Moss, Dusk, Ember, Theme,
    Chalk), **Pace** and **Directness**, and a footer: "Kept for every talk. You can also
    ask {name} to slow down mid-talk."
  - **Chalk** is the square body from the face explorations' Character variant. It is
    flat, drawn in the theme's text colour rather than a palette: white in dark mode, ink
    in light mode (only dark was checked). If it should be white in every theme, give it a
    fixed white fill with a light outline so it doesn't vanish on light backgrounds.
  - **The sheet's foot glows in the voice's colour** (kept on purpose).
- **The header pill shows the companion's face** (34px, in its look) instead of the flame
  placeholder (#590). It blinks and breathes, takes the talk's pose (attentive while
  listening, thinking, a soft smile while speaking) and nods when you finish a line.
- **Two views mid-talk**, switched by a **native segmented control** under the header (Expo
  UI: SwiftUI's segmented picker on iOS, Material 3 segmented buttons on Android):
  - **Conversation**: today's transcript.
  - **Companion**: the face large (about half the screen width) over the aurora, posed by
    the talk's state and leaning in with your voice, the state word under it, and the
    latest line as a caption ("You" or the name, up to 4 lines) so nothing is lost.
  - **Touch the face and it smiles back** (as in the Character variant): a soft haptic, the
    glad pose and a nod, then after about 1.6s it returns to the talk's pose (sooner if the
    talk changes state). Screen readers hear it as a "{name}" button that smiles back.
    Only the large face responds; the pill's face doesn't.
  - Both views stay mounted (the transcript keeps its scroll) and cross-fade; the big face's
    clock stops while it's hidden. The chosen view is remembered per user.
  - In the Companion view the face shows twice, small in the pill and large on stage. That
    was left as is; hide the pill's face there if it reads as doubled.

**Backend (store-gap safe).** Voice, pace and directness already save to preferences
(`talkVoice`, `talkPace`, `talkDirectness`). The look and the chosen view are new
**optional** preference fields; store the look by its preset name, not the drawing.

Not chosen:
- **B**: the companion itself on the card (108px, with a voice orb badge and a
  "{voice} · Change" pill) as the way into the sheet.
- **Our animated switch**: the glass pill with our own sliding indicator, the same
  segmented control the app uses elsewhere.
- Today's voice chips on the card.

## Notes for the real build

- A gesture must not change mid-drag: keep its identity stable and route handlers through a
  ref (see `prototype-mood/use-mood-slider.ts`).
- Worklets can't copy a gesture object. Capture only shared values and worklet functions in
  `useAnimatedReaction` (capturing the whole slider flooded the log with warnings).
- The HeroUI bottom sheet presents on a closed → open change. Keep it mounted and flip
  `isOpen`; mounting it already open shows nothing.
- The voice sheet (`@gorhom/bottom-sheet` under HeroUI) needs a **fixed height**
  (`enableDynamicSizing={false}` and one snap point below the Dynamic Island) and
  **content panning off** (drag by the handle). Gorhom locks a sheet's list unless it reads
  the sheet as fully open; a content-sized, content-draggable sheet stopped scrolling after
  a voice change until reopened. Its content view is absolute and sized by its content, so
  give it the sheet's height minus the 24px handle, and zero HeroUI's `pb-safe-offset-3`
  in the same style, so the list runs to the bottom edge and pads itself. Check sheet
  layout after a fresh launch: a hot reload can make it look fixed when it isn't.
- Prototype-only shortcuts to drop: the `?face=` param and switcher, `?overall=` fake
  scores, opening session-end with no session, sheets ignoring the rate limits, Talk's
  `&talk=live` fake talk, and the look and view kept only for the app session.
- Checked on the iOS simulator (iPhone 17 Pro) and, for the mood slider's haptics, on a
  physical iPhone. Android wasn't checked, including Talk's Material 3 switch. The voice
  samples' playback and the orb's audio swell were checked on the simulator; a real talk's
  microphone wasn't.

## Viewing the prototypes

On `proto/xolace-face`, in a dev build:

- `xolace://session-end?path=solo&face=b` (`off`, `a`, `b`, `c`)
- `xolace://profile/insights?face=a` (`off`, `a`, `b`, `c`; `&overall=none|12|45|78|96`)
- `xolace:///?face=b&proc=orb&mirror=label` (Reflect, the chosen combination; `face` takes `off`, `a`, `b`, `c`; `&proc=orb|face`,
  `&mirror=none|label|above`, `&screen=live|processing|mirror|demo`)
- `xolace://talk?face=a` (Talk, the chosen entry; `face` takes `off`, `a`, `b`). Add
  `&talk=live` for a fake talk with the two views, and `&seg=custom` for the animated switch
- `xolace://prototype-face`: the original five face explorations
