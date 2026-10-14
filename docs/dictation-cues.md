# Dictation Cues

**Status:** Planned. Specified, unbuilt.
1. ✅ A take that is only sound tags reads as silence (`72e051d`).
2. Strip sound tags from dictation text (§3.2). Standalone; ships first.
3. The cue build (§3.1, §3.3–§3.6). It can be merged before calibration,
   but **the backend isn't deployed until real-voice calibration (§6.1) has
   set the `logprob` floor and checked the pause threshold**, and consent
   v3.0 (§4) plus the website privacy-policy line are ready.

**Layer:** The Fire. Dictation cues are input signal for the mirror, not a
feature of their own.

**Terms** (`CONTEXT.md` › Dictation): a **sound tag** is Scribe's raw label
for a non-speech sound (`[sighs]`). A **dictation cue** is what we keep from
a Plus dictation take about *how* it was said. Avoid "voice cue": "voice"
already means a TTS voice.

## 1. The problem

Plus dictation sends a take to Scribe v2 and drops everything but the text. Scribe
also hears *how* something was said: sighs, laughter, crying, long pauses. Typed
input already carries this kind of signal (`inputDuration`, `freezeOccurred` →
the articulator's "Behavioral Signals" section). Spoken input carries more of it,
and we throw it away.

Worse, today the tags themselves leak: `transcribeAudio` returns Scribe's
`text` as-is, so a Plus take can put `[sighs] I'm tired…` into the composer.

## 2. What Scribe gives us

Measured 2026-10-14 against `scribe_v2`, default `tag_audio_events` (on), with
`timestamps_granularity=word`:

- `words[]`: `{ text, start, end, type, logprob }`. `type` is `word`, `spacing`
  or `audio_event`.
- **Sound tags** arrive as `audio_event` items, e.g. `[sighs]` 0.10–0.66s,
  `[laughs]` 9.38–11.96s. They also appear inline in `text`.
- **Pauses are not tagged.** A 3.0s gap between `time.` (end 3.8s) and `Um,`
  (start 6.8s) shows only as a timestamp gap.
- **False positives exist.** Five seconds of quiet room noise came back as a
  single `[pause]` event; users have also seen `[silence]`.
- `logprob` is near 0 for clear words and lower for weak tags (`[pause]` −0.098,
  `[laughs]` −0.054). Not yet calibrated.
- An attempted `[crying]` (in generated speech) was not detected. **Every number
  above is from generated speech.** Real voices are untested.

## 3. Design

### 3.1 Cue shape

```ts
type DictationCue =
  | { kind: "event"; label: string; near: string; side: "after" | "before" }
  | { kind: "pause"; seconds: number; near: string; side: "after" };
```

- `near`: ≤ 6 spoken words next to the cue. This anchors the cue to the text
  in plain words; no timestamps or character offsets are kept.
- `side`: `"after"` (the cue followed `near`) unless the cue is an event with
  no spoken word before it in the take, e.g. an opening `[sighs]`. Then
  `near` is the first words that follow and `side` is `"before"`.
- **Pause:** a gap ≥ 2.5s between two `word` items, so always `"after"`.
  Gaps between takes are not seen. (ponytail: one fixed threshold, checked
  in §6.1.)
- **Event:** an `audio_event` whose label is on an allowlist (`sighs`, `laughs`,
  `crying`, `sniffs`, `exhales`, `clears throat`, …). `pause` and `silence`
  events are dropped. Pauses come from gaps instead.
- Drop events with `logprob` below a floor set by §6.1.
- At most 12 cues per take.

### 3.2 Server: `convex/ai/transcribe.ts` (step 2)

`transcribeAudio` returns `{ text, taggedText } | null`: `text` with sound
tags stripped, `taggedText` as Scribe sent it. Vent keeps using `taggedText`,
so its behavior doesn't change. Dictation uses `text`. Shipped #557 clients
then get clean text with no client change.

Step 3 adds `cues` to the same return value.

### 3.3 Server: `dictation.transcribe`

Add an optional arg `withCues: v.optional(v.boolean())`.

- Absent (shipped #557 clients): return the plain string as today. **Store-gap
  rule: the old return shape must not change.**
- `true`: return `{ text, cues }`.

### 3.4 Client: `use-plus-dictation.ts` + reflection reducer

- Append `text` to the composer as now. **Cues never appear in the composer.**
  The user's words stay the user's words.
- Cues live in the reflection reducer state next to `entryText`:
  `VOICE_APPEND` carries `{ text, cues }`, and `RESET` clears both. A take
  aborted or dropped (`take !== takeRef.current`) appends nothing, so it adds
  no cues.
- **Edits:** at submit, a cue is dropped if its `near` no longer appears in
  the final input. Normalize both sides first (lowercase, strip punctuation,
  collapse whitespace), because Scribe's words keep their punctuation
  (`time.`) and `joinDictation` changes spacing. Rewording a passage drops its
  cue. That's acceptable: a stale cue is worse than a missing one.

### 3.5 Server: `sessions.submitInput`

- New optional arg `dictationCues`: an array of the cue validator, capped at
  40 items, with each `near` / `label` length-capped. This is a trust
  boundary: validate the shape and clamp sizes.
- Stored on the session next to `freezeOccurred`, as `dictationCues:
  v.optional(...)`. That's a new optional field, so it's safe for existing rows.
- Old clients omit it, so nothing changes for them.

### 3.6 Articulator

`getBehaviorNotes` gains a voice block, rendered only when cues exist:

```
## Voice Signals
They spoke some or all of this. While speaking:
- sighed before "I don't know where to start"
- laughed after "kind of stupid, honestly"
- paused 3s after "tired all the time"
These come from audio detection and can be wrong. Treat them as texture, not
fact. Never quote a cue back, never name it ("you laughed", "you cried"), and
never let a cue override what they wrote.
```

Spoken spans are not marked in mixed typed + dictated input. "Some or all"
is enough, and tracking spans through edits isn't worth it.

The cues reach **both** the first mirror (`process.ts`) and refinement
mirrors (`clarify.ts`), passed exactly as `freezeOccurred` is. Refinement
takes themselves collect no new cues (§5).

Why the guardrails: a mirror saying "you were crying" when the tag was a false
positive reads as surveillance, and would be wrong in exactly the
confident-but-wrong way that `confidence-aware-mirroring.md` exists to stop.
A cue may shift *what the mirror notices*, e.g. a laugh after a self-dismissal
("kind of stupid") is a deflection worth gently naming as a deflection, without
saying how it was detected.

### 3.7 Understanding

Unchanged in v1. Cues are raw input like `freezeOccurred` and live on the
session, not in `emotional_metadata`. The classifier does not see them
(§6.2). Add a field to the Understanding once something reads it.

## 4. Privacy

- Cues are derived from the user's voice and are as sensitive as `rawInput`.
  They live on the session row only. Retention, data wipe and account
  deletion delete whole session rows (`purgeSessions`), so cues go with
  `rawInput` with no extra work.
- Never logged, never in analytics, never in peer reflections, the distiller,
  shared follow-ups or the Xolace channel. The distiller and anonymizer read
  `rawInput` (clean text), so cues can't leak through them.
- **Consent v3.0.** The v2.0 `voice_processing` wording promises only
  transcription ("…sent to ElevenLabs to be transcribed. The audio is never
  stored."). Keeping cues goes beyond that (rule 12: claims literally true).
  Bump `VOICE_PROCESSING_CONSENT_VERSION` to `3.0` with wording along the
  lines of "…to be transcribed. The audio is never stored. We keep only the
  words, and short notes like a sigh or a pause, to shape your reflection."
  Everyone is re-consented on their next recording.
- **The privacy policy on the website** needs a matching line before step 3
  deploys.
- Vent: out of scope. Vent is never stored and stays that way.

## 5. Out of scope (v1)

- Refinement turns ("say more") via dictation collect no cues. v1 covers the
  first input only. Add once first-input cues prove useful.
- Cues in timeline, insights or memory/RAG.
- Tone, pitch or energy analysis (Scribe doesn't provide it).
- On-device dictation fallback: no cues (platform STT gives none).
- Cues as classifier input (§6.2).

## 6. Open

1. **Real-voice calibration (gates deploying step 3).** Record ~10 real takes
   (calm, upset, crying, laughing off, noisy room). Set the `logprob` floor
   and check the 2.5s pause threshold from them. Cues are never logged, so
   production can't calibrate; these takes are the only source.
2. **Classifier input (deferred).** Should cues inform `intensity` /
   `supportNeed`? Crying is a strong signal, but feeding it to safety-adjacent
   classification needs its own safety review (rule 5).

## 7. How we'll know it works

Eval set in `convex/ai/prompts/__evals__` (on `harness.eval.ts`): the same
text with and without cues. Pass criteria:
- The mirror never names a cue.
- With a deflection-laugh cue, the mirror notices the minimizing more often than
  without.
- A false-positive cue (e.g. `crying` on flat, neutral text) does not change
  the mirror's emotional read.
