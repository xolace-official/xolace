# Compounding: does the 90-day anchor cap hold a new normal? (#535 item 4)

**Decision: no change to `ANCHOR_CAP_MS`** (`convex/compounding/detect.ts`). A shorter cap doesn't release a permanent shift any sooner, and "release once easing holds N weeks" can't fire on one (see below). What holds a new normal "heavier than your usual" is the live usual itself, not the anchor.

## Finding

On the post-#527 engine, a permanent 20-point drop on a steady 70 releases on the **same day under every cap from 30 to 90 days**: day 111–119 on a 60-day history, 153–161 on 120 days, 195–196 on 365 days. Once the cap lapses, `judgeOpen` falls back to the live baseline, and that is still made almost entirely of the old 70s (everything older than 21 days, at a 90-day half-life). The stretch ends only when the live usual itself catches up. A shorter cap just swaps one high baseline for another.

"Release when easing has held N weeks" doesn't help either. `isEasing` needs the last two days' readings *above* current steadiness, and on a flat new normal the readings sit at steadiness. So easing never holds.

What the cap *does* change is how long a stretch lasts **after a real recovery**. A 60-day dip that recovers on day 60 ends on day 98 at a 90-day cap, on day 79–84 at 60, and on day 63–72 at 30–45. Over that time the anchor keeps the stretch "easing". Shortening the cap is a call about how long easing should show, not a fix for item 4, so it's left as is.

If a new normal should stop reading as compounding sooner, the lever is the usual (for example, a shorter `BASELINE_HALF_LIFE_DAYS` after a long stretch), not the anchor cap. That needs a product call.

## Method

`sim.ts` (from the repo root: `TRIALS=20 bun docs/research/compounding-anchor-cap/sim.ts`; filters `CAPS`, `HISTORY`, `DIPS`, `DROP`, `NOISES`, `CADENCE`). This runs the real engine (`computeSteadiness`, `opens`, `bandOf`). `endsWith(C)` mirrors `judgeOpen` with `ANCHOR_CAP` = C days, and parity with the real `judgeOpen` is asserted at 90 on every evaluation.

- The person holds a steady 70 for {60, 120, 365} days, then drops 20 for {30, 60, 90} days or permanently, then returns to 70.
- Cadence is {daily, every 2d, weekly}. Noise is {0, ±5, ±10}. The stretch opens at the first `opens()`, and each later session is judged up to day 365.
- Cells show the median drop-day each cap ends the stretch on (`end`), and the share still open at day 365 (`open`).

## Zero noise (end day by cap)

| cadence | history | dip | opens | 30 | 45 | 60 | 90 |
|---|---|---|---|---|---|---|---|
| daily | 60 | 30 | d19 | 49 | 59 | 59 | 59 |
| daily | 60 | 60 | d19 | 65 | 65 | 79 | 98 |
| daily | 60 | 90 | d19 | 92 | 92 | 92 | 109 |
| daily | 60 | perm | d19 | 111 | 111 | 111 | 111 |
| daily | 120 | 60 | d21 | 68 | 68 | 81 | 98 |
| daily | 120 | perm | d21 | 153 | 153 | 153 | 153 |
| daily | 365 | 60 | d21 | 72 | 72 | 81 | 98 |
| daily | 365 | perm | d21 | 195 | 195 | 195 | 195 |
| 2d | 120 | perm | d22 | 154 | 154 | 154 | 154 |
| 2d | 365 | perm | d22 | 196 | 196 | 196 | 196 |
| weekly | 60 | 60 | d21 | 63 | 70 | 84 | 98 |
| weekly | 120 | perm | d21 | 161 | 161 | 161 | 161 |
| weekly | 365 | perm | d21 | 196 | 196 | 196 | 196 |

A short cap never ends a stretch while the dip is still going: every dip ends at or after its recovery day.

## Noise ±10, 10 trials (median end day by cap)

The same picture holds. For a permanent shift, the caps release within a few days of each other, and in most cells on exactly the same day. The cap only moves the post-recovery tail of a 60-day dip.

| cadence | history | dip | opened | 30 | 45 | 60 | 90 |
|---|---|---|---|---|---|---|---|
| daily | 60 | perm | 90% | 111 | 111 | 114 | 116 |
| daily | 60 | 60 | 90% | 64 | 65 | 80 | 96 |
| daily | 120 | perm | 100% | 143 | 143 | 143 | 143 |
| daily | 365 | perm | 100% | 186 | 186 | 186 | 186 |
| daily | 365 | 60 | 100% | 73 | 73 | 82 | 94 |
| 2d | 60 | perm | 90% | 100 | 100 | 100 | 112 |
| 2d | 120 | perm | 100% | 136 | 136 | 136 | 136 |
| 2d | 365 | perm | 100% | 174 | 174 | 174 | 174 |
| 2d | 120 | 60 | 100% | 68 | 70 | 80 | 102 |
| weekly | 60 | perm | 90% | 133 | 133 | 133 | 133 |
| weekly | 120 | perm | 100% | 133 | 133 | 140 | 140 |
| weekly | 365 | perm | 100% | 175 | 175 | 175 | 175 |
| weekly | 60 | 60 | 80% | 63 | 70 | 84 | 105 |

No stretch was still open at day 365 in any cell.
