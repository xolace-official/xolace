# Badges for showing up: motion brief and prompt

> **For you, before you send this (delete this box before pasting).**
>
> Written with what we learned from the check-ins tests:
>
> - **Nothing invented.** The badges already exist as finished, illustrated artwork, so
>   the animated part of the film is built only from that real art. Every phone screen is
>   real footage from the app. The studio never draws a badge, an icon or an interface.
> - **No people, no diagram, one idea.** The idea: *every day you come back counts, and
>   Xolace notices.* The hero image is the "days showing up" ladder, which really is a
>   seed growing into a great tree across eight badges.
> - **Simple to make.** Coins are circles. The main move is a coin turning over and showing
>   the next badge on its other side. That's a flip and an image swap, nothing more.
>
> Assumed: 24 s plus a 15 s cut; music only, no voiceover; end card A "Coming soon to
> Xolace", B "New in Xolace. Update to see yours." (swap to B if 1.17.0 is already out
> when this posts).
>
> **Attach with the prompt:**
>
> 1. **The badge art**, the original high-resolution files in
>    `packages/backend/scripts/badges/media/` (mostly 2048 × 1152 on a grey background).
>    Send at least these:
>    - The tree, in order: `showing-up-5`, `-10`, `-25`, `-50`, `-100`, `-250`, `-500`,
>      `-1000`.
>    - Firsts: `first-session` (paper boat), `first-letter` (envelope), `first-read`
>      (book), `first-listen` (headphones), `first-talk` (microphone), `first-exercise`
>      (compass).
>    - **Don't send `asked-for-chat.png`**: its paper plane looks like Telegram's logo.
> 2. **The back of the coin:** `apps/mobile/assets/images/badges/back-disc.png` (750 × 750,
>    transparent).
> 3. **Screen recordings from the app.** Already recorded, in
>    `docs/marketing/badges-footage/` (gitignored; iPhone 17, dark, 1206 × 2622, 60 fps,
>    no audio): `01-badge-arrives-and-turns.mp4` (23 s: arrives, confetti, turned over and
>    back), `02-achievements-scroll.mp4` (12 s), `03-badges-are-here.mp4` (11 s),
>    `04-ten-days-showing-up.mp4` (24 s: opened from the list, turned over and back).
>    `raw/` has the uncut takes. What they cover, from the dev states screen:
>    - "A badge arrives: First quote saved", the whole thing, then "A badge arrives,
>      turned over".
>    - "Achievements, at the top", scrolling slowly down the list.
>    - "Badges are here: what was already earned".
>    - Optional: "10 days showing up (dawn), three pinned" or a badge being pinned to the
>      profile.
>    Record in the dark theme, at default text size, with a clean status bar.
> 4. The app icon `apps/mobile/assets/images/icon.png` and the logo
>    `xolace-mobile-site/public/logo/main-logo.png` (or its source file).

---

## 0. Your role

You are the best motion designer in the world. You are leading the launch film for a
top-tier, trillion-dollar company: the kind of short, quiet product film where the real
product, shown big and beautifully lit, is the hero. Restraint is the standard. One idea,
carried completely, with nothing on screen that doesn't earn its place.

Treat this brief as the client's truth about the product. Where it sets a rule, follow it
exactly. Where it describes a direction, beat it if you can, and say why.

This film belongs to a series about Xolace's new features. They share type, sound and the
end-card layout.

## 1. The product, in one minute

**Xolace** is a mental-health companion app for iOS and Android. People talk or write
through how they feel and keep a gentle daily rhythm.

Xolace now gives **badges** for showing up and trying things:

- **Days showing up:** 5, 10, 25… up to 1,000 different days you came back. Gaps are fine;
  this count never resets. Its badges grow from a seed into a great tree.
- **Firsts:** your first session, first letter, first read, first listen, first talk,
  first exercise, and more.
- **Streaks**, for days in a row (their badges are fires that grow).
- When you earn one, it arrives in the app: the coin falls in, you can turn it over to see
  its engraved back, and it brings **sparks** you can spend on a **streak freeze**.
- You can **pin** up to three to your profile.
- **Been here a while?** Everything you did before badges arrived counts. Your badges are
  already waiting.

### The benefit (what the film is really about)

**Every day you come back counts, and Xolace notices.** Not how hard the day was, not how
much you struggled: just that you came back, and that you tried something new. Over time
it adds up to something you can see.

The feeling to leave: *the small things I do here are seen, and they're growing into
something.*

## 2. Craft rules for this film

- **Use only the supplied art.** Every badge on screen is one of the supplied images,
  exactly as drawn. Never draw, redraw, recolour or invent a badge, icon or symbol.
- **Every phone screen is real footage.** Never build or mock up interface.
- **No human figures.** No people, faces, hands, silhouettes, animals or characters. (Flux,
  Xolace's mascot, may appear inside the real footage; don't animate it anywhere else.)
- **Three things on screen, ever:** the background, the coins (or the phone with footage),
  and one line of type at a time. No floating icons, stickers, trophies, stars or ribbons.
- **One focal point at a time.** A hero coin is at least 40% of frame height in 16:9 and
  at least 45% of frame width in 9:16.
- **Coins are flat discs.** They can slide, scale, glow and turn over. They don't bounce,
  spin like a top, wobble, sparkle-burst or roll.

### Preparing the art

The source files are badges on a grey background. Cut each one out: crop a square just
inside the gold rim's outer edge (about 0.7% in, to lose the grey fringe), then apply a
circular mask with a 1 px feather. Keep the art at full resolution; don't sharpen, grade
or add outlines. The coin back (`back-disc.png`) is already cut out.

## 3. Words and safety

| Use | Never use |
|---|---|
| badge, achievement | trophy, medal, prize, reward, win, level up, rank, XP |
| showing up, coming back, trying something new | grind, crush it, hustle, keep it up or lose it |
| sparks (only as in "sparks you can spend") | points, coins (on screen), currency |
| days showing up, a streak | perfect record, never miss a day |

Don't put **ember**, **lantern**, **kindling**, **outreach** or **echo** on screen;
they're names of other things in Xolace.

- **Badges reward showing up, never struggling.** Nothing on screen links a badge to a
  hard day, a feeling or how bad things were.
- **No pressure.** No countdowns, broken streaks, fires going out, red badges, "don't lose
  it", leaderboards or comparing yourself with anyone.
- **Gentle and hopeful, never clinical.** No graphs, no brain imagery.
- **No health claims.** Never say Xolace treats, cures, heals or fixes anything.
- **Not a game.** It should feel like a quiet keepsake, not a slot machine: no jackpot
  bursts, coin showers or flashing.
- **Accessibility.** No flashes, text contrast of at least 4.5:1, every line held long
  enough to read twice.

## 4. Concept: "It all counts"

*Pitch this, sharpen it, or beat it (see §11, phase 1).*

**The idea in one line.** One coin turns over again and again, and each time the seed on
its face has grown, because every day you come back counts.

| Image | What it means |
|---|---|
| One small coin in a dark, warm-lit space: a seed just breaking the soil | The first few days back |
| The coin turning over, and the seed growing on each turn: sprout, sapling, tree, blossom, great tree | Every day you come back adds up, gaps and all |
| Other coins settling in around it: a paper boat, an envelope, a book, headphones, a microphone, a compass | Trying something new counts too |
| The real arrival in the app | This is what it looks like when one reaches you |
| The "Badges are here" screen, already full | If you've been here a while, yours are already waiting |

## 5. Story: beat by beat (24 s)

30 fps. Timecodes for 16:9; 9:16 keeps the same beats with its own framing (§6).

| # | Time | Beat | What we see | Motion | Sound |
|---|---|---|---|---|---|
| 1 | 0:00–0:03 | **A seed** | The dark, warm-lit background (§8). One coin in the centre, `showing-up-5`: a seed breaking the soil. Its glow breathes once. **S1** fades in. | The coin fades in and scales from 96% to 100% over 0.8 s, then holds still. | Soft room tone, first warm piano notes. |
| 2 | 0:03–0:09 | **It grows** | The coin turns over and over. Each turn shows the next rung: `-10`, `-25`, `-50`, `-100`, `-250`, `-500`, `-1000`. The tree grows on its face, from sprout to great tree. The coin grows a little with it, and its glow warms. S1 out, **S2** in. | Each turn is a flip on the vertical axis: the coin narrows to a sliver, the art swaps, it widens again. The first turn takes 0.6 s; they quicken a little through the middle and the last one takes 0.8 s, landing on the great tree. A hold of at least 0.2 s between turns. The coin grows from 40% to 50% of frame height across the beat. | One soft, low note on each turn, rising gently; a warm swell on the last one. |
| 3 | 0:09–0:13 | **So do the firsts** | The tree coin eases up and back. Six smaller coins settle in around it, one at a time, in a calm arc: `first-session`, `first-letter`, `first-read`, `first-listen`, `first-talk`, `first-exercise`. **S3** appears. | Each coin fades in and drifts about 2% into place, 0.35 s apart, cubic-bezier(.33, 1, .68, 1). Once all are there, nothing moves. | A soft chime per coin, very quiet. |
| 4 | 0:13–0:19 | **When one reaches you** | The coins fade back. The phone rises into frame (§6) playing the real arrival: "NEW BADGE", the coin falling in, the sparks counting up, then the coin turned over to its engraved back. No super. | The phone rises once, about 0.8 s, and doesn't move again. Footage at true speed. | Music continues; the app's own sounds off. |
| 5 | 0:19–0:21 | **Already waiting** | Still on the phone: the "Badges are here" screen, already full of earned badges. **S4** appears beside it. | Cut inside the phone with a 0.2 s crossfade. | Music lifts slightly. |
| 6 | 0:21–0:24 | **End card** | The phone sinks away. The great-tree coin comes back alone, in the centre, then the end card (§9) beneath it. | Phone out, about 0.8 s, ease-in. The coin fades in. The end card holds still for at least 2.5 s. | The music resolves. Silence for the last half second. |

**Optional 15 s cut:** beat 1 (2 s) → beat 2 (5 s, every rung but faster) → beat 4
(4 s) → end card (4 s). S1 and S2 only.

**On-screen lines (whole lines only, §8):**

- **S1:** *Every day you come back counts.*
- **S2:** *Gaps are fine. It never resets.*
- **S3:** *Trying something new counts too.*
- **S4:** *Been here a while? Yours are already waiting.*

## 6. Two ratios, two compositions

Design each ratio on its own; no centre crops. The phone and every coin are always whole,
never touching the frame edge.

| Beat | 16:9 landscape | 9:16 portrait |
|---|---|---|
| 1–2 Hero coin | Coin centred, 40% → 50% of frame height. Supers below it, centred. | Coin centred, a little above the middle, 45% → 60% of frame width. Supers below it, inside the key content zone. |
| 3 Firsts | Tree coin centred, about 34% of frame height. Six coins of about 15% of frame height on a gentle arc below and beside it. Super below. | Tree coin in the upper middle, about 40% of frame width. Six coins of about 22% of frame width in two rows of three below it. Super below them. |
| 4–5 Phone | Phone about 82% of frame height, its centre at about 64% of frame width. S4 on the left, left-aligned. | Phone about 64% of frame height, centred. S4 above it. |
| 6 End | Coin centred in the upper half; end card below. | Coin in the upper third; end card in the middle. |

**The phone:** a simple, slim device silhouette in near-black (`#0B0A10`), with a soft,
wide shadow. No device-maker logos, buttons, reflections or glass glare.

## 7. The coin turning over

This is the film's signature move, so build it carefully:

1. The coin narrows horizontally to about 4% of its width over the first half of the turn
   (ease-in), as if turning on its vertical axis. A real 3D turn with slight perspective
   is better if you can; keep the perspective subtle.
2. At its narrowest, swap to the next image.
3. It widens back to full width over the second half (ease-out, cubic-bezier(.2, .8, .2, 1)).
4. During the turn, a soft highlight sweeps across the gold rim once, and the glow behind
   the coin dims slightly, then comes back a little warmer.

Only in beat 6 may the coin show its back (`back-disc.png`) once, then turn back to the
great tree.

## 8. Look: palette, type and motion

### Palette

| Role | Colour | Use |
|---|---|---|
| Background | `#0E0C15` at the edges → `#2A2440` in the centre | The whole film |
| Warm glow behind the hero coin | core `#FFCB78` at about 45% opacity, edge `#F2A33A`, fading to clear over about 1.6 coin widths | Breathes slowly; warms as the tree grows |
| Ink | `#F3F0FA` for supers, `#B0A9C2` for small print | Type |

A light film grain (2–3%) over everything so the gradients don't band. The badges bring
all the other colour; don't add any.

### Type

All free Google Fonts.

- **Newsreader Italic:** S1 to S4 and the end-card line.
- **Bricolage Grotesque Bold:** the end-card title only.
- **Figtree Medium:** the CTA and small print.

Sentence case. Supers appear and leave as a whole line: fade with a short rise (about 1.5%
of frame height), 0.32 s, cubic-bezier(.23, 1, .32, 1); fade out 0.2 s. No per-letter or
per-word animation, no counters ticking up, no scaling, no morphing.

### Motion language

- **Calm and continuous.** Every move eases and ends in stillness; no hard cuts between
  beats.
- **Curves from the app:** arrive cubic-bezier(.33, 1, .68, 1); ease-out (.2, .8, .2, 1);
  settle (.23, 1, .32, 1). No overshoot or bounce.
- **The glow breathes:** about 4.8 s a breath, no more than 2% scale.
- **No** glitches, whip pans, zoom blurs, light leaks, particle bursts, confetti (outside
  the real footage) or shine flashes.

### Using the footage

- Interface at 100% speed. Trim between moments; never speed up or ramp.
- Replace the status bar with a clean one (9:41, full signal and battery). Otherwise add
  nothing to the interface and don't grade it.
- The confetti in the real arrival is the app's own; leave it as it is.

## 9. End card and CTA

Held at least 2.5 s, in the same layout as the other films in the series.

1. Xolace logo lockup (supplied).
2. **Badges for showing up** (Bricolage Grotesque Bold).
3. *Every day you come back counts.* (Newsreader Italic)
4. CTA, two versions:
   - **A (default):** Coming soon to Xolace
   - **B (launch day):** New in Xolace. Update to see yours.

## 10. Sound

- **No voiceover.** It must read with the sound off.
- **Music:** the series' family: warm piano or soft Rhodes with a light pad, about 75 bpm,
  a little warmer and fuller as the tree grows, resolving on the end card. No sad
  minor-key piano, ticking, choirs, risers, drops, or game-style fanfares and coin sounds.
- **Sound design:** soft room tone, one low note on each turn of the coin, a very quiet
  chime as each first settles in. That's all.
- **Mix:** -14 LUFS integrated, true peak no higher than -1 dBTP, stereo 48 kHz.
- **Rights:** original or fully licensed for worldwide, perpetual use on organic and paid
  social, web and app stores.

## 11. Safe zones, delivery and order

**Safe zones.**

- **16:9 (at 1920 × 1080):** title safe 96 px left and right, 54 px top and bottom; keep the
  bottom 130 px clear of supers.
- **9:16 (at 1080 × 1920):** no text or key action in the top 220 px, the bottom 440 px or
  the right 140 px; 64 px left margin. Key content zone: x 64–940, y 220–1480.

**Phase 1, test:** one 16:9 frame each of beats 1, 3 and 6, and a motion test of beats 1–2
(about 9 s: the seed, and the coin turning over until it lands on the great tree), built
from the real art. **Share it before going further.**

**Phase 2, animatic:** both ratios at full length, temporary music, footage placed, supers
in position.

**Phase 3, final:**

- 16:9: 3840 × 2160 ProRes 422 HQ, and 1920 × 1080 H.264.
- 9:16: 2160 × 3840 ProRes 422 HQ, and 1080 × 1920 H.264.
- 30 fps, Rec. 709, stereo 48 kHz, -14 LUFS.
- End card A and B for each ratio; the optional 15 s cut; textless masters; music, effects
  and mix stems; an SRT per ratio; a cover frame per ratio; project files, font list and
  music licence.

## 12. Before you hand in, check

- [ ] Every badge on screen is supplied art, cut out cleanly, unaltered. Nothing drawn or
      invented.
- [ ] Every phone screen is real footage. No mocked-up interface.
- [ ] No people, faces, hands or characters outside the real footage.
- [ ] The tree visibly grows across the turns, in the right order, and lands on the great
      tree.
- [ ] With the sound off, a viewer gets it: every day you come back counts, firsts count
      too, and your badges may already be waiting.
- [ ] It feels like a keepsake, not a game: no bursts, showers, flashes or fanfares.
- [ ] Words follow §3. No pressure, no comparison, no claims.
- [ ] 9:16 is its own composition; everything important is inside the safe zones.
- [ ] It sits beside the other films as one series.
