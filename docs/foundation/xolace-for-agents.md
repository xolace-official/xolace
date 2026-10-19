# Xolace — for agents

Dense, rule-first version of [`xolace.md`](./xolace.md) (team doc) and [`xolace-technical.md`](./xolace-technical.md) (numbers, models). Those two are the source of truth; if this file disagrees with them, they win. As of 2026-10-07.

## Identity

- **Tagline:** Skincare for your mind.
- **Definition:** Xolace helps people reflect on what they're feeling in the moment — clarity, what's underneath, catching what's compounding — so real support can work.
- **Real support, in order:** (1) Kindlings inside the app; (2) a trusted person or clinical care when needed. Xolace gets people to outside care sooner; it never stands in for it.
- **Vision:** mental health care as ordinary and daily as skincare. Daily maintenance is the destination; reaching early is the entry.
- **Win condition:** fewer people ever reach the mental-health queue. **Hard guardrail:** someone who needs care and doesn't get it is a failure, whatever else improves. Never optimise toward fewer referrals.
- **Long horizon:** front door to mental health; the whole path up to clinical care, one phase at a time.
- **Brand style:** the campfire. The fire is the AI — it illuminates, it isn't who you came to meet.

## The three layers — every feature lives in exactly one

| Layer | Job | Members |
|---|---|---|
| **The Fire** | Reflect, understand, remember | Mirror + refinements, Understanding, memory, profile |
| **Kindlings** | Support | The catalogue below |
| **The Hearth** | Bring people back daily | Streaks, daily quotes, timeline, campfire card, follow-ups, notifications, Xolace channel, insights, steadiness |

## Rules to apply when building

1. **Feature test.** (a) Does it help someone catch what they carry earlier, or make care more daily? (b) Does it live in exactly one layer, and if it's support, is it inside the sandbox? Fail either → push back.
2. **Support comes from the sandbox.** The AI *chooses* support from the curated catalogue; it does not invent it. The mirror reflects and does not prescribe by default. Free-form nudges are allowed only where safety coverage exists (e.g. a future suggestion tone), and should mostly resolve to a Kindling.
3. **What qualifies as a Kindling:** in-app · human-reviewed before shipping · tagged with emotional states it is and isn't suitable for · reports start/completion.
4. **Two doors to the same shelf:** routed (Kindling picks after a reflection) and browsed (tabs). Same items, same standard.
5. **Safety leads.** At safety level *elevated* or *crisis*, Kindling stands down and support need is forced to *none*. Anything new that touches user input must pass the same safeguard.
6. **The Understanding rule.** Never call a model to re-derive what a session's Understanding already holds. Read it via `internal.understanding.getUnderstanding` / `recentUnderstandings`. A new model call needs a new input modality or a new output artifact.
7. **Consent line.** Anonymous aggregate counts with a minimum group size (≥ 3) need no consent. Anything containing a person's words needs it.
8. **Outside-app channels** (WhatsApp, SMS, widgets, etc. — Phase 3): opt-in, discreet by default (never reveal what someone is carrying), sandbox and safety still apply.
9. **Retention through benefit.** Habit mechanics are welcome. No hard usage limits for anti-dependency; watch for unhealthy use instead. Not goals: time in app, sessions or streak length for their own sake.
10. **One companion, rules unchanged.** The mirror is the Fire as a capable journal that remembers you. The **companion** (Xolace+, `Building`) is the Fire speaking out loud: one named character, never several specialists. Rules 1–5 still apply to it.
11. **Money.** The mirror is free, always. Plus pays for the support layer. No ads. Never sell or license user data.
12. **User-facing claims** (store, policy, in-app copy) must be literally true today. The privacy promises below are a standard, not current fact.
13. **Status honesty.** Label anything you describe as `Shipped`, `Building` or `Planned`. Steadiness, compounding detection, baseline and steadiness insights (Plus) are `Shipped`.

## Kindling catalogue

| Kindling | Code | Routed | Browsed | Status |
|---|---|---|---|---|
| Sit with this | `breathing`, `sit-with-this` | yes | after a reflection | Shipped |
| Vessa (audio/music) | `audio_topic_*`, `music_topic_*` | yes | yes | Shipped; name not in UI yet |
| Xolacers (trained volunteer peer counsellors) | `xolacer` | yes | yes | Shipped |
| Lantern (library) | `read`, `library` | yes | yes | Shipped |
| Trusted Bridge | `bridge` | yes | no | Shipped |
| Episode reframe | `episode_reframe` | yes | — | Shipped; description unconfirmed |
| Peer reflections | `reflections` | no | after a reflection | Shipped |
| Vent | `vent` | no | yes | Shipped (browsed), Planned (routed) |
| Clinical care | — | — | — | Planned |

## Pipeline (one reflection)

Safeguard (rules + OpenAI moderation; none/gentle/elevated/crisis) ∥ Haiku classifier (emotions, intensity, specificity, themes, `supportNeed` none/light/active) ∥ episodic memory search → mirror plan (pure rules: tone, `claimStrength`, escalation, follow-up tier, exercise) → Sonnet articulator writes mirror → store Understanding (`emotional_metadata`) → fan out (distiller, memory ingest, slot-fill, escalation). Refinements: max 2 (3 mirrors). On completion: streaks, profile stats, Reflection Agent (only writer of `semantic_profiles`), Kindling, follow-up workflow.

**Kindling runs only if:** genuine completion · `supportNeed` light/active · safety < elevated · Plus · no set today. One Haiku call picks exactly 4 from the catalogue with a *why* each; < 3 valid → ship nothing.

## Phases

1. Reflect — Shipped. 2. Support layer — **current**; next: route Vent, Vessa name in UI, learn from completions, grow catalogue, close safety gaps. 3. Proactive — reach out first, incl. outside-app channels. 4. Clinical — licensed care as top of the sandbox, context carried over with consent.

## Metrics

North star: **weekly active reflectors** (≥ 1 completed reflection that week). Counterweight: steadiness change over 30 days. Guardrails: escalation reaches help; unhealthy use watched; fewer referrals never a goal.

## Privacy standard and known gaps

Standard: reflections private by default · nothing with your words reaches others without consent · you can delete everything · Vent is never stored · we don't train AI on your words.

Known gaps (don't claim otherwise): escalation alerts no one · crisis resources Ghana-only · no clinical reviewer · Xolacer training not recorded · chat moderation after delivery · peer pool can fall back to raw mirror · shared reflections can't be withdrawn · deletion misses PostHog/Clerk/RevenueCat and Stream can fail silently · Vent acknowledgement logged + TTS kept 1 h · provider zero-retention unverified.

## Open questions (don't decide these silently — ask)

Persona · real competitors · target market · persona/companion features · suggestion tone scope · routing peer reflections · episode reframe definition · free Lantern and Xolacer chat · mission wording · gap owners · clinical reviewer.
