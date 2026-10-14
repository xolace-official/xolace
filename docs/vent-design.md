# Vent v1 — Design Spec

**Branch:** `feat/vent-v1`  
**Date:** 2026-06-10  
**Memorable thing:** "I released something real."

The dissolution is the emotional peak. The ≤8 words are a quiet coda — the fire already happened before they appear. Every design decision serves the moment of release, not the acknowledgement.

---

## Visual System

### Particle Engine

- **Library:** `@shopify/react-native-skia` (Skia canvas, already installed)
- **Count:** 80–120 particles
- **Shape:** Soft circles, 2–4px radius, with a light Skia paint blur for a glow quality
- **Architecture:** Particle positions and velocities stored in Reanimated `useSharedValue` array, updated per-frame via `useDerivedValue`. Metering value from `use-metering-recorder` (`src/lib/audio/`) feeds directly into field radius and color interpolation on every frame. Runs on the UI thread — no JS bridge overhead.

### Color Arc

| State | Particle color | Feeling |
|---|---|---|
| Idle | `#9399A8` (cool ash-gray) | Weight, held breath |
| Recording — low volume | Barely shifts from idle, slow outward drift | Stirring |
| Recording — high volume | Warming to `#C4883F` → `#E8A84C` from center out | Heat rising |
| Burning flash | `#FFF3E0` (white-amber) | Combustion |
| Scatter → fade | Dimming to transparent | Gone |

Color shift is driven by the normalized metering value (0–1) the recorder already exposes. Metering maps to both field radius and ambient warmth simultaneously.

---

## Screen Layout

```
┌─────────────────────────────────────┐
│                             [×]     │  ← close, top-right (already exists)
│                                     │
│                                     │
│         ●●● ●●●● ●●●               │
│        ● ●       ● ●               │
│          ●  ◉◉  ●                  │  ← particle field, vertically centered
│        ● ●       ● ●               │
│         ●●● ●●●● ●●●               │
│                                     │
│        "Speak your weight"          │  ← 14px, foreground/25, fades after 3s
│                                     │
│                                     │
│              [  🎤  ]               │  ← centered, 56–64px circle
└─────────────────────────────────────┘
```

Full dark screen, no status bar visible, no header, no secondary chrome. After the initial label fades: just the particle field and the mic button.

---

## State-by-State Behavior

### Idle — Entry Animation (2–3s)

Particles drift in from the screen edges, find orbital positions, and form the compact sphere. Not instantaneous — they assemble.

- Field radius: ~120px from center
- Duration: ~2s, `Easing.out(Easing.cubic)` on particle positions
- After assembly: sphere pulses once (scale 1.0 → 1.08 → 1.0 over 1.2s via Reanimated `withSequence`)
- Settles. `"Speak your weight"` fades in below the sphere (14px, `foreground/25`)
- Label fades out after 3s — screen just waits

### Recording (tap to start)

- Sphere begins to expand; field radius scales from ~120px to ~220px as metering rises
- Particles warm in color from center outward, driven by normalized metering value each frame
- Mic button icon swaps to stop square (same position, animated swap)
- All other UI fades to `opacity: 0` — only particle field and stop button remain

### Burning (tap to stop)

Sequence is four beats, not a single scatter:

1. **Compression** (~0.5s): particles rush back toward center; field rapidly contracts
2. **Flash** (~100ms): Skia paint spikes to `#FFF3E0` at the center point
3. **Explosion**: particles scatter outward fast, each with a slightly different velocity vector — some go up, some drift sideways, some fall. Not a uniform radial burst.
4. **Fade**: particles dim to transparent as they fly outward; screen empties
5. **Silence**: 1 full second. Nothing on screen except the dark background.

The compression beat before the explosion is intentional — weight gathers one last time, then releases. Without it the scatter just looks like particles flew away.

### Pinch-Spread (optional accelerant)

If the user spreads two fingers across the particle field during the burn sequence, the animation jumps immediately to the explosion phase, skipping the compression beat.

They chose to release — honor it instantly.

Implementation: `PinchGestureHandler` from `react-native-gesture-handler`. Only active during the `processing` state. Does nothing in idle or recording states.

### Acknowledgement (the coda)

- ≤8 words appear centered in the empty space where particles were
- Size: 16–18px. Weight: regular (not bold). Color: `#F5F0E8` (cream-white)
- Reveal: character-by-character or word-by-word over 500ms total
- TTS audio plays simultaneously with text reveal
- Words fade over 3s after fully revealed

### "Gone." (the period)

- Appears where the acknowledgement words were
- Same size or slightly smaller than acknowledgement text
- Color: `#F5F0E8` at 60% opacity — more muted than the words
- Stays 2s, then fades over 1s
- Auto-dismiss to home after words fully clear

---

## Intro Screen (first-time only)

Shown when `ventIntroSeen` is `false` in the Zustand toggles slice (same pattern as `bridgeIntroSeen`).

**Backdrop:** same particle system but sparse and slow — 20–30 particles, lazy drift, barely visible. Sets the mood before the user speaks a word.

**Copy (centered, vertically):**

```
This is a space to say the unsaid.
Your voice is never stored.
It goes when you close.
```

Text style: ~16px, `foreground/70`, generous line spacing.

**Button:** `"I understand"` — text only, no background fill, subtle foreground glow on press. Not a hero CTA. Sets `ventIntroSeen = true` on press.

---

## Sound Design

Sound effects are provided externally. The intended quality for each moment:

| Moment | Quality |
|---|---|
| Entry particle assembly | Dry sand or dust settling — barely audible, 1–2s |
| Recording starts | Soft inhale, < 200ms |
| During recording | Silence — the user's voice IS the sound |
| Compression + flash | Paper crinkle, sharp, ~300ms |
| Scatter | Sustained crackle fading to silence, ~1.5s |
| "Gone." appears | Single soft chime, decays naturally |

The crinkle → crackle → silence sequence is the emotional payload. It must not sound digital, notification-like, or UI-generic.

---

## Mic Button

- Size: 56–64px diameter circle
- Position: centered horizontally, bottom of screen (~100px from bottom edge)
- Idle: subtle pulsing ring (ring fades in and out on a ~2s loop), mic icon foreground color
- Recording: solid ring, slightly larger, warm amber (`#C4883F`), icon swaps to stop square
- On stop: button fades to 0 opacity as burn sequence begins

---

## Acknowledgement Text Answers (CEO Plan §16)

| Question | Decision |
|---|---|
| Waveform vs orb vs particles | Particles — see above |
| "Gone." typography | Materializes in place, not slide-in; appears where particles were |
| Mic button design | Tap to start / tap to stop |
| Does acknowledgement text appear? | Yes — small, late, after dissolution completes |
| Transition idle → recording | Particle field expands, color warms, UI chrome fades |
| Duration limit UX | No visible timer; subtle: particle field stops expanding at max radius regardless of volume — a soft ceiling, not a countdown |

---

## Implementation Stack

| Concern | Tool |
|---|---|
| Particle rendering | `@shopify/react-native-skia` canvas |
| Per-frame updates | `useDerivedValue` from `react-native-reanimated` |
| Color interpolation | Reanimated `interpolateColor` passed into Skia paint |
| Pinch gesture | `PinchGestureHandler` from `react-native-gesture-handler` |
| Entry/exit transitions | Reanimated `withTiming`, `withSequence`, `withSpring` |
| Particle state | `useSharedValue` array (not useState — stays on UI thread) |
| Metering input | Normalized 0–1 from `src/lib/audio/use-metering-recorder.ts` (already specified in CEO plan) |

---

## Sound Candidates (Unused — Removed from Bundle)

The following files were produced during sound design but are not wired up. They were removed from `assets/sounds/vent/` to keep the bundle lean. Re-add if a playback approach is found that doesn't lag or conflict with the active recorder session.

| File | Intended moment |
|---|---|
| `a-single-soft-human-4-recording-starts.wav` | Recording starts |
| `quiet-smoldering-4-afterglow.wav` | Afterglow / session end |
| `fine-grain-sand-4-entry-fav.wav` | Entry / prompt appears |
| `one-single-soft-1-chime.wav` | Chime / confirmation |
| `a-single-sheet-2-compression.wav` | Compression phase |

**Active sound:** `burning-paper-crack-2-scatter.wav` — plays once per burn, timed to scatter phase (compress + flash delay). See `use-vent-sounds.ts`.

---

## What Is Not In v1

Per the CEO plan scope boundary — these are explicitly deferred:

- Haptic sync to the particle animation (v1.1)
- Mood check after vent (schema field exists, not wired)
- Animated particle trails during scatter (nice-to-have, adds complexity)
- Custom particle shapes (circles only in v1)
