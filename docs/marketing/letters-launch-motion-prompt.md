# Letters launch film: motion brief and prompt

> **For you, before you send this (delete this box before pasting).**
>
> What I assumed, so you can change it:
>
> - **Length:** a 32 s master in both ratios, plus an optional 15 s cut-down.
> - **CTA:** end card A says "Coming soon to Xolace". End card B ("New in Xolace. Update to
>   write your first letter.") is ready for launch day. Change one line in §9 if you'd
>   rather use one wording only.
> - **Sound:** music and sound design only, no voiceover. The three on-screen lines carry
>   the words, so the film works with the sound off.
> - **Legal line:** an optional small line on the end card: "Letters are for adults. English
>   only for now." Both are true today (send and receive need a confirmed adult; the check
>   is English-only). Remove it if you don't want it.
> - **Look:** the Default theme (warm violet night, cream paper, ember) and the Warm font
>   pair, because that's what most users see.
> - **Concept:** I wrote a lead concept ("For whoever needed it", a paper town at dusk). The
>   studio is asked to pitch it and one alternative before production.
>
> **Attach with the prompt:**
>
> 1. The screen recording. The prompt expects these moments (§7). Record them with the
>    dev fixtures (no real person's words), a clean status bar (9:41, full battery), in
>    Default light (Daylight). A Dusk pass of the open-and-read moment helps too:
>    - the Letters card on Connect, tapping **Write a letter**
>    - the write sheet: a starter chip, a few typed lines, **Send**
>    - "Reading it over…": the fold in thirds and the glow, then the rise and "It's on its way."
>    - the recipient side: the sealed letter, dragging it up to open, the words rising
>    - tapping **This reached me**: the stamp, then "Acknowledged"
>    - the Sent list showing "Received · acknowledged" with the ringed dot
> 2. The logo lockup. No vector version exists in the repos. The largest file is the
>    website's `public/logo/main-logo.png` (818 × 305, in the `xolace-mobile-site` repo);
>    the app's `apps/mobile/assets/images/brand/logo-lockup.webp` is smaller (536 × 200).
>    Better: the original source file from whoever designed the logo.
> 3. Optional stills from the prototype repo, `design/letters-v2/`: `20-sealed.png`,
>    `21-open.png`, `01-connect-card.png`, `27-lock-screen.png`. They show the paper, seal
>    and type up close.

---

## 0. Your role

You are the best motion designer in the world. You are leading the launch film for a
top-tier, trillion-dollar company, the kind of film that ships on a keynote stage and that
other studios study afterwards. You have full creative authority inside this brief, and you
are accountable for every frame. Restraint is the standard here: one idea, carried
completely, with nothing on screen that doesn't earn its place.

Treat this brief as the client's truth about the product. Where it sets a rule (vocabulary,
safety, accuracy), follow it exactly. Where it describes a direction (concept, beats,
framing), beat it if you can, and say why.

## 1. The product, in one minute

**Xolace** is a mental-health companion app for iOS and Android. People talk or write
through how they feel, sit with short exercises, and keep a gentle daily rhythm. Version
1.17.0 is a full redesign: warmer, calmer, more tactile. It rewards people for showing up,
never for how much they struggle.

**Letters** is one of the new features in it.

- You write a short letter of encouragement (40 to 500 characters) to someone you'll never
  meet. It's unsigned: no name, no photo, no handle. You can write one a day.
- Before it goes anywhere, Xolace reads it over (an automatic check for kindness, safety
  and privacy). On screen this is a short "Reading it over…" moment while the letter folds
  and glows.
- Xolace then **places** it with a **recipient**: someone who chose to receive letters,
  whom Xolace thinks it fits. It's never sent to someone who didn't opt in.
  Letters aren't urgent: the recipient's notification comes a while later, and never
  during their quiet hours.
- The recipient opens it by dragging the sealed letter up. Above every letter the app
  says *"Someone wrote this for whoever needed it."*
- The recipient can **acknowledge** it once, without words, by tapping **This reached
  me**. They can never reply. There is no conversation, ever.
- The sender only ever sees their letter's status: waiting, then **received**, then, if
  the recipient chooses, **acknowledged**. In their Sent list a small ember dot lights up
  when it's received; when it's acknowledged, a thin ring appears around it. Neither side
  ever learns who the other is.

### Why it matters (the benefit the film must carry)

Two quiet goods, one for each person:

1. **For the recipient: being seen without being exposed.** A few kind lines from a real
   person who wrote them for "whoever needed it", and found you, without you having to
   explain anything, post anything, or owe a reply.
2. **For the sender: the quiet good of writing kindness for someone else.** Putting care
   into words for a stranger, with nothing expected back. And later, a small light that
   says it reached someone.

The film is about that exchange of warmth between two strangers who will never meet. The
feature walkthrough is secondary: one short reveal so people know it's real and how it
works.

## 2. Words: use these, avoid these

Xolace's product vocabulary is precise, and the film's supers, captions, file names and
any VO script must follow it.

| Use | Never use | Why |
|---|---|---|
| letter | message, note, DM, chat, post | A letter is its own thing, not a chat |
| sender, recipient | match, pen pal, buddy, friend | They never meet or talk |
| received (Xolace placed it with someone) | delivered, sent to your inbox | "Delivered" means something else at Xolace |
| acknowledge, "This reached me" | like, react, reply, respond, heart | It's one wordless gesture, once |
| placed, finds someone it fits | matched by AI, algorithm, analysed your feelings | Keep the mechanism quiet and human |
| a few kind lines, encouragement | advice, therapy, support group, treatment | It isn't treatment and doesn't claim to be |

Don't use the words **spark**, **ember**, **lantern**, **kindling** or **echo** in on-screen
text. They are names of other things in Xolace (points, other features). The *colour* and
*imagery* of an ember are fine and central; the word isn't needed.

## 3. Tone and safety: hard rules

- **Gentle and hopeful. Never clinical.** No charts, no brain imagery, no "studies show".
- **No health claims.** Never say or imply that Letters (or Xolace) treats, cures, heals,
  fixes or prevents anything. "A few kind lines" is the claim.
- **No crisis imagery.** No one crying alone, no rain on a dark window, no empty beds,
  pills, hospitals, hotlines, wrists, bridges, ledges, storms or anyone "at rock bottom".
- **Don't dramatize struggle.** The recipient is an ordinary person on an ordinary morning,
  not someone rescued from despair. The letter is a warm surprise, not a lifeline. Never
  imply that the more someone hurts, the more they get.
- **Anonymity on screen.** No names, avatars, usernames or profile photos anywhere,
  including in the footage and in any mock UI you build. No faces of the two people: show
  hands, silhouettes in lit windows, or paper figures. Anyone shown must read as an adult
  (Letters is adults-only). Hands and figures should reflect a wide range of people.
- **No reply, ever.** Never show a reply field, a chat bubble, a typing indicator, a
  thread, or a second letter going back. What travels back to the sender is *light*, not
  paper.
- **No counts or competition.** No numbers of letters, likes, leaderboards, streak flames
  or "letters sent today" counters.
- **Don't imply people read your letters.** The check is automatic. Don't show staff,
  reviewers, or eyes reading.
- **Accessibility.** No flashes or strobes (stay well under three flashes a second), on-screen
  text at a contrast of at least 4.5:1, and every line held long enough to read twice.

## 4. Lead concept: "For whoever needed it"

*Pitch this, sharpen it, or beat it (see §12, phase 1).*

**Logline.** At dusk, someone writes a few kind lines for a stranger. The letter folds,
seals itself with a small warm light, and is carried across a sleeping paper town to a
window that left its lamp on. In the morning someone else finds it. They can't reply; they
can only let a little light travel back. Two windows, far apart, both a little warmer.

**The world.** A small town made of layered cut paper, seen at dusk, through the night, into
morning. Every lit window is a person. It is quiet, tactile and warm: cream paper, soft
violet sky, ember light. Real depth from layered paper planes, gentle parallax, soft
light, no hard outlines. It must feel hand-made and premium, never cute or childish.

**Why each image means something.** Every visual carries part of the benefit, so the story
reads without words:

| Image | What it means |
|---|---|
| A letter with an empty space where a signature would go | Unsigned: kindness without a name attached |
| The paper folding in thirds, a warm seal glowing to life | The letter is read over and protected before it travels |
| The folded letter shrinking into a small warm light that rises and sways | Care carried, gently, with nowhere it has to be |
| Many windows; only some have **a small lamp lit in the window** | Only people who said yes receive letters. The lamp is their "yes" (the old idea of leaving a light on for someone) |
| The light passing unlit windows and settling at one lamp | Xolace places it with someone it fits, never with someone who didn't ask |
| Night giving way to morning before it's opened | Letters aren't urgent. It arrives at a gentle moment, not a buzz at 3 a.m. |
| The recipient's world in day tones, the sender's in dusk tones | Two different people, places and times |
| Only a small glow travelling back, no paper | Acknowledged once, without words. No reply, no thread, no debt |
| A tiny dot lighting up, with a thin ring, at the sender's window | The sender knows it reached someone, and nothing more |
| Two far-apart windows, both a little warmer, in one wide shot | Neither knows the other. Both were seen. |

**Don't** turn the travelling light into a paper sky lantern or a firework (Lantern is a
separate Xolace feature, and fireworks are loud). It's a small ember-coloured glow, about
the size of a firefly relative to the town.

## 5. Story: beat by beat (32 s master)

30 fps. Timecodes are for the 16:9 master; 9:16 keeps the same beats and timing, with its
own framing (§6). Supers (on-screen lines) are marked **S1 to S3** and listed in §8.

| # | Time | Beat | What we see | Motion and transition | Sound |
|---|---|---|---|---|---|
| 1 | 0:00–0:03 | **Dusk, one window** | The paper town at dusk. Slow push towards one lit window (the sender's). Inside, a desk lamp, a sheet of cream paper. A hand rests a pen on it. | Slow continuous push-in, eased (cubic-bezier .2, .8, .2, 1). Paper layers drift in gentle parallax. | Room tone, a distant evening. First soft piano note. |
| 2 | 0:03–0:07 | **A few kind lines** | Close on the paper. Lines of ink appear as if written by the unseen hand, in the letter's typeface (§8): *"I don't know what you're carrying, but you're allowed to rest today."* The signature line stays empty. **S1** fades in beside or above the paper. | The writing is the content, written at a natural pace, not kinetic type: no words flying in, scaling or morphing. The camera holds still. | Pen on paper, close and intimate. |
| 3 | 0:07–0:10 | **Folded, sealed** | The paper folds in thirds: bottom third up, then top third down. A warm seal on the fold glows to life. Optional: a 1.5 s match cut to the app showing the same fold and the "Reading it over…" label (footage moment A). | Fold: two folds of 0.3 s each, cubic-bezier(.65, 0, .35, 1), real 3D hinge with soft perspective. Seal glow: 0 → 50% in 0.15 s, dips to 30% in 0.1 s, then up to full in 0.55 s, like a match catching. This is the app's own motion; match it. | Two crisp paper creases, then a soft warm swell as the seal lights. |
| 4 | 0:10–0:15 | **Carried over the town** | The folded letter shrinks into a small warm light and rises out of the window, swaying gently. The camera follows it over the rooftops. Hundreds of windows; some have a small lamp lit. It passes unlit ones and drifts towards one lamp far away. Night passes overhead: the sky moves from night to first light. | Shrink to about 15% in 0.4 s, then a slow rise with one gentle side-to-side sway, cubic-bezier(.65, 0, .35, 1). Three tiny embers fall from it and fade. One continuous camera move: no cuts. | Music opens up: a second voice (soft strings or pad) enters. No whooshes. |
| 5 | 0:15–0:19 | **Morning, another window** | A different window in morning light, a different person's place: a mug, a plant, daylight. The folded letter drifts in and comes to rest on the sill or table, its seal softly lit. **S2** appears above it, small, like the line the app shows above every letter. | The letter's arrival copies the app: it drifts in from lower left, a slight turn settling to level, over 0.9 s, cubic-bezier(.33, 1, .68, 1). One drift, then stillness. | Morning birds, very low. A single warm bell-like note as it settles. |
| 6 | 0:19–0:25 | **The product, for real** | Match cut: the paper letter becomes the letter on a phone screen. Footage moment B: a thumb drags the sealed letter up, the seal splits, the flaps open, the words rise. A breath to read. Then the thumb taps **This reached me**, and the round stamp lands on the letter (moment C). | Match cut on the letter's shape and position: the paper's edge lands exactly on the screen's letter. The phone eases in (spring, no overshoot) while the paper world stays soft behind it. Keep the app's motion at true speed (§7). | Soft paper sound under the seal splitting, a gentle low "thup" as the stamp lands. |
| 7 | 0:25–0:28 | **Light, not words** | Back in the paper town: from the morning window, one tiny glow lifts and travels back across the town to the sender's window (now in day light too). There, a small ember dot lights up, and a thin ring draws itself around it. **S3** fades in. | The glow travels on the same gentle curve, reversed and quicker. The dot "catches" with the same 0.15 / 0.1 / 0.55 s rhythm as the seal, over 0.8 s. The ring draws once and stays. Optional: 1 s of footage moment D (the Sent row turning "Received · acknowledged"). | The music resolves. One soft chime, the same family as the seal's sound. |
| 8 | 0:28–0:32 | **Both lit (end card)** | Pull back to a wide shot: the two windows far apart, both a little warmer than the rest. The town softens into the end card (§9). | Slow pull-back that settles into a held frame, cubic-bezier(.23, 1, .32, 1). End card holds still for at least 2.5 s. | Final chord rings out. Silence for the last half second. |

**Optional 15 s cut-down:** beats 2 (2 s) → 4 (3 s) → 6 (5 s, footage) → 7 (2 s) → end card
(3 s). S1 and S3 only.

## 6. Two ratios, two compositions

Design each ratio on its own. A 9:16 that is a centre crop of the 16:9 isn't acceptable.
The story's direction of travel changes with the frame: in 16:9 distance is horizontal; in
9:16 it's vertical.

| Beat | 16:9 landscape (3840 × 2160) | 9:16 portrait (2160 × 3840) |
|---|---|---|
| World | A wide town under a big sky. Horizon low (bottom third), so two thirds of the frame is sky: the space between two strangers is the subject. | The town climbs a hillside, windows stacked on many levels. Sender near the bottom, recipient near the top. |
| 1–2 Sender | Sender's window in the left third. The paper sits left of centre; S1 sits in the right half, in the open sky area. | Sender's window low in frame; the paper fills the middle; S1 sits above the paper in the upper safe area. |
| 3 Fold | Paper centred-left, seal on the fold line, camera dead-on. | Paper centred, slightly larger relative to the frame (the fold is the hero shot on a phone). |
| 4 Journey | The light travels **left to right** across the sky (forward in time, the way we read). The camera tracks sideways with parallax. | The light **rises up the hillside** (as it does in the app: the letter really does rise). The camera cranes up in one move; the sky lightens as we climb. |
| 5 Arrival | Recipient's window in the right third; S2 above the letter. | Recipient's window near the top of the hill; the camera settles level with it. S2 above the letter, under the top safe zone. |
| 6 Reveal | Phone right of centre, about 78% of frame height, upright. Paper town continues softly behind on the left. No supers on top of the footage. | Phone centred, about 70% of frame width, inside the key content zone (§11). The town blurs above and below. No supers on the footage. |
| 7 Return | The glow travels **right to left**, back to the sender. S3 centred in the sky. | The glow **falls gently down the hillside**, like the three small embers falling earlier. S3 in the middle of the frame. |
| 8 End card | Wide two-window shot; lockup centred, lines below. | Two windows top and bottom of the frame; lockup and lines in the middle. |

## 7. Using the screen recording

The demo recording is proof that the feature is real, not the story itself. Use it inside
the paper world, as a reveal.

- **Where:** moment B and C (open, read, acknowledge) are the reveal in beat 6. Moments A
  (the fold and "Reading it over…") and D (the Sent row going "Received · acknowledged") are
  optional short inserts in beats 3 and 7. The Connect card and the write sheet are
  available if you need a cutaway, but you probably don't.
- **How much:** at most 8 s of footage in the 32 s master (about a quarter). The paper
  world carries the rest.
- **Into and out of footage:** always by match cut on the letter: the paper letter and the
  on-screen letter share shape, colour and position at the cut. No hard cuts to a phone
  on a grey background, no "app demo" spin-ins.
- **Device:** a clean, frameless rounded screen or a minimal, unbranded device
  silhouette. No third-party device logos. A soft warm shadow, never a glossy reflection.
- **Speed:** keep the app's own animations at 100% speed. Their timings are designed (the
  seal split, the words rising, the stamp's tiny settle). Trim between moments instead of
  speeding up or ramping.
- **Clean-up:** the status bar should read 9:41 with full battery. Blur or replace anything
  that isn't fixture text. Don't add UI that isn't in the app (no reply box, no badges, no
  counters, no fake notifications).
- **Touches:** if you add a touch indicator, make it a soft translucent dot, not a cursor
  or a hand illustration over the screen.
- **Colour:** don't grade the footage. It's the real product's colours; match the paper
  world to it, not the other way round.

## 8. Look: palette, type and motion

The film should look like it was made by the same people who made the app. These values
come straight from the redesign.

### Palette

| Role | Colour | Use |
|---|---|---|
| Night | `#0E0C15` | The night sky and darkest paper layers |
| Night surface | `#17141F`, `#201C2B`, `#29243A` | Rooftops and paper layers by depth |
| Violet (sky) | `#B7A3FF` at night, `#6B4EE6` by day | Sky gradients and rim light only, sparingly |
| Violet wash | `#2A2440` (night), `#ECE7FF` (day) | Haze, atmosphere |
| Ember | `#F5B04F` (night), `#F2A33A` (day) | Lamps in windows, the travelling light |
| Ember seal | radial `#F7B567` → `#E9822F` → `#B4532A` | The seal, the stamp, the sender's dot |
| Ember glow | `rgba(245,160,70,.8)` → `rgba(236,122,102,.3)` → clear | Glow around the seal and the travelling light |
| Glow heart | `#FFE6B8` → `#F4A24A` | The hottest centre of the light |
| Letter paper | Day `#FBF5E9` (folded side `#F0E5D0`), Dusk `#F2EADB` (`#E3D6BE`), Night `#E6DCC8` (`#D4C5AA`) | The letter itself. Change the paper tone with the time of day, as the app does |
| Letter ink | `#2B2233` | The handwriting and the letter text |
| Day background | `#F7F5FB` | The recipient's morning |
| Text on dark | `#F3F0FA`, secondary `#B0A9C2` | Supers on night scenes |
| Text on light | `#191524` | Supers on day scenes |

The letter paper has 5-point-radius corners in the app, one soft warm shadow, **no ruled
lines and no texture**. Paper in the town can have fibre and grain; the letter itself stays
clean, like in the app.

### Type

All four are free Google Fonts.

- **Newsreader Regular (roman):** the letter's own words, wherever a letter is shown.
- **Newsreader Italic:** the reflective lines (S1 to S3, the end-card line). The app uses it
  for quiet moments like "It's on its way."
- **Bricolage Grotesque Bold:** the word "Letters" on the end card only.
- **Figtree Medium/Semibold:** small functional text (the CTA, the legal line).

Sentence case everywhere. Supers appear and leave as a whole line: fade in with a short
rise (about 1.5% of frame height), 0.32 s, cubic-bezier(.23, 1, .32, 1), 0.12 s delay; fade out
0.2 s. No per-letter or per-word animation, no scaling, no morphing, no masks sweeping
across words.

**Supers (all real lines from the app):**

- **S1:** *Write to someone you'll never meet.*
- **S2:** *Someone wrote this for whoever needed it.*
- **S3:** *No names. No replies. Just a few kind lines, for whoever needs them.*

### Motion language

- **Calm, continuous, physical.** Long eased camera moves, few cuts (no shot under about
  1 s), and every move ends in stillness. If something moves, it has a reason.
- **Use the app's curves:** arrive cubic-bezier(.33, 1, .68, 1); fold (.65, 0, .35, 1);
  drift and ease-out (.2, .8, .2, 1); settle (.23, 1, .32, 1). Springs settle with little or
  no overshoot (damping ratio about 0.8). The only "bounce" in the whole film is the stamp's
  tiny 6% squash as it lands.
- **Breathing rhythm:** ambient pulses (window glows, the seal while waiting) breathe at
  the app's pace: about 4.8 s per breath by day and 6.7 s at night, scaling no more than 2%.
- **Transitions:** folds, light, and match cuts. No glitches, whip pans, zoom blurs, light
  leaks, 3D text flips or shape-burst transitions.
- **Light behaves like light.** The ember glow lights the paper around it as it passes;
  windows brighten slightly as it goes by.

## 9. End card and CTA

Held for at least 2.5 s, over the softened two-window frame.

1. Xolace logo lockup (we'll supply it).
2. **Letters** (Bricolage Grotesque Bold).
3. *Kind words from a stranger, for whoever needs them.* (Newsreader Italic)
4. CTA, two versions:
   - **A (default):** Coming soon to Xolace
   - **B (launch day):** New in Xolace. Update to write your first letter.
5. Optional small legal line (Figtree, secondary colour): *Letters are for adults. English
   only for now.*

Deliver both CTA versions as separate files. No App Store or Google Play badges unless we
ask; if we do, use the official badges unmodified.

## 10. Sound

- **No voiceover.** The film must read with the sound off (most social plays start muted);
  the supers carry the words.
- **Music:** intimate and warm, about 70–80 bpm. A felt or close-miked piano or a soft
  Rhodes, joined at the journey by gentle strings or a warm pad. A major key with suspended,
  unresolved chords that resolve on the acknowledgement (beat 7). It should feel like a
  quiet room, not a trailer. Avoid sad minor-key piano, heartbeats, ticking clocks, choirs,
  big risers and drops.
- **Sound design:** close and real: pen on paper, two paper creases, a soft warm swell as
  the seal lights, a faint airy shimmer as the light travels (no whoosh), morning birds very
  low, a single bell-like note when the letter settles, a soft low "thup" for the stamp, a
  chime in the same family when the sender's dot lights.
- **Mix:** -14 LUFS integrated, true peak no higher than -1 dBTP, stereo 48 kHz.
- **Rights:** original or fully licensed music for worldwide, perpetual use on organic and
  paid social, web and app stores. Send the licence with the files.

## 11. Safe zones

Keep all supers, the phone screen's key action and the end card inside these. Check each
ratio against the current TikTok, Instagram Reels and YouTube Shorts overlay templates.

**16:9 (values at 1920 × 1080, scale for 4K):**

- Title safe: 96 px in from the left and right, 54 px from the top and bottom.
- Keep the bottom 130 px clear of supers (player controls and platform captions).
- If captions are burned in, they sit in a band from 860 to 940 px from the top, centred.

**9:16 (values at 1080 × 1920, scale for 4K):**

- Top 220 px: no text or key action (account name, headers).
- Bottom 440 px: no text or key action (captions, descriptions, buttons).
- Right 140 px: no text or key action (the like and comment rail).
- Left 64 px margin.
- **Key content zone:** x 64–940, y 220–1480. Supers, the phone's key action and the end
  card live here. Burned-in captions, if any, sit at y 1260–1460.
- Make a cover frame per ratio with the title inside the key content zone.

## 12. What to deliver, and in what order

**Phase 1, concept (before any production):**

- Your lead concept and one alternative. For each: a logline, how each image carries the
  benefit (in the spirit of the table in §4), and 3 style frames per ratio.
- A 5-second motion test of the hero moment: the fold, the seal lighting, and the rise.

**Phase 2, animatic:** both ratios at full length with temporary music, the footage roughly
placed, and the supers in position. Timings per beat as in §5, or your improved version
with reasons.

**Phase 3, final:**

- **16:9:** 3840 × 2160 ProRes 422 HQ master, and 1920 × 1080 H.264 for upload.
- **9:16:** 2160 × 3840 ProRes 422 HQ master, and 1080 × 1920 H.264 for upload.
- 30 fps, Rec. 709, stereo 48 kHz, -14 LUFS.
- Each ratio with end card A and end card B.
- The optional 15 s cut-down in both ratios.
- Textless versions of every master (no supers, no end-card text).
- Stems: music, sound effects, and the full mix.
- An SRT per ratio with the on-screen lines, for accessibility.
- A cover frame per ratio (PNG).
- Project files (After Effects, Cinema 4D, Blender or equivalent), the font list, and the
  music licence.

## 13. Before you hand in, check

- [ ] The benefit lands without the supers: being seen without being exposed, and the
      good of writing kindness for someone else.
- [ ] How it works is clear: write, Xolace places it with someone who opted in, they
      acknowledge it once without words, and they never reply.
- [ ] Vocabulary follows §2: received, not delivered; letter, not message.
- [ ] Nothing in §3 is broken: no claims, crisis imagery, faces, names, replies or counters.
- [ ] The screen recording fills at most 8 s of the 32 s film (the rest is the animated story). It plays at true speed, is joined by match cuts, and has no added UI.
- [ ] 9:16 is its own composition, and everything important is inside the safe zones.
- [ ] Every super holds long enough to read twice, at 4.5:1 contrast or better.
- [ ] The film works muted and with sound.
