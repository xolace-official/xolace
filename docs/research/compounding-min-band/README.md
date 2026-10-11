# Compounding: measuring MIN_BAND (#528)

**Decision: `MIN_BAND` 12 → 10** (`convex/compounding/detect.ts`).

After #527, a sustained 20-point drop on a clean 60–365-day usual never opened at 12 (gap peaks between 10 and 12 inside 60 days). 11 still misses it on daily 60/120-day histories. 10 catches it every time at zero noise (day 19–21) and 87–100% of the time at noise ≤ ±10, while false opens stay ~0 (worst: 1/100, weekly sessions, 30-day history, ±10).

A clean 10-point dip still never opens at 10 (the gap approaches 10 from below; `opens` needs gap > band). With noise it can: 3–7% on weekly ±10 histories at 10 vs 0–2% at 12. At ±20 every band opens dips — there the band is the usual's SD, not `MIN_BAND`, so changing the floor doesn't move it.

## Method

`sim.ts` (run from the repo root: `TRIALS=30 bun docs/research/compounding-min-band/sim.ts`; filters `CADENCE`, `HISTORY`, `BANDS`, `DROPS`, `NOISES`). Real engine: `computeSteadiness` + `opens`, with the band floor varied; parity with the real `opens()` is asserted at 10 (the production floor) on every evaluation; with `BANDS` set, include 10 to keep the check.

- Steady 70 for {30, 60, 120, 365} days, then 70 − drop for up to 60 days.
- Cadence {daily, every 2d, weekly}; uniform noise {0, ±5, ±10, ±20} per reading; seeded.
- `opens` evaluated at every landing session (as in production). Cells: share of trials that opened within 60 days, and the median drop-day it first opened. Drop 0 = false opens.
- Main grid: 30 trials per noisy cell. Edge cells below: 100 trials.

## Edge cells, 100 trials (bands 10 / 11 / 12)

| cadence | history | noise | drop | B10 | B11 | B12 |
|---|---|---|---|---|---|---|
| 2d | 120d | ±5 | 0 | – | – | – |
| 2d | 120d | ±5 | 10 | – | – | – |
| 2d | 120d | ±5 | 20 | 100% d22 | 69% d28 | 7% d40 |
| 2d | 120d | ±10 | 0 | – | – | – |
| 2d | 120d | ±10 | 10 | – | – | – |
| 2d | 120d | ±10 | 20 | 97% d22 | 83% d24 | 40% d28 |
| 2d | 30d | ±5 | 0 | – | – | – |
| 2d | 30d | ±5 | 10 | – | – | – |
| 2d | 30d | ±5 | 20 | 100% d16 | 100% d18 | 84% d20 |
| 2d | 30d | ±10 | 0 | – | – | – |
| 2d | 30d | ±10 | 10 | 1% d20 | – | – |
| 2d | 30d | ±10 | 20 | 98% d14 | 89% d16 | 73% d18 |
| 2d | 365d | ±5 | 0 | – | – | – |
| 2d | 365d | ±5 | 10 | – | – | – |
| 2d | 365d | ±5 | 20 | 100% d22 | 100% d28 | 88% d38 |
| 2d | 365d | ±10 | 0 | – | – | – |
| 2d | 365d | ±10 | 10 | – | – | – |
| 2d | 365d | ±10 | 20 | 100% d22 | 99% d26 | 88% d36 |
| 2d | 60d | ±5 | 0 | – | – | – |
| 2d | 60d | ±5 | 10 | – | – | – |
| 2d | 60d | ±5 | 20 | 99% d20 | 69% d22 | 12% d22 |
| 2d | 60d | ±10 | 0 | – | – | – |
| 2d | 60d | ±10 | 10 | – | – | – |
| 2d | 60d | ±10 | 20 | 91% d20 | 67% d20 | 30% d22 |
| weekly | 120d | ±5 | 0 | – | – | – |
| weekly | 120d | ±5 | 10 | – | – | – |
| weekly | 120d | ±5 | 20 | 97% d21 | 70% d28 | 20% d35 |
| weekly | 120d | ±10 | 0 | – | – | – |
| weekly | 120d | ±10 | 10 | – | – | – |
| weekly | 120d | ±10 | 20 | 95% d28 | 78% d28 | 53% d35 |
| weekly | 30d | ±5 | 0 | – | – | – |
| weekly | 30d | ±5 | 10 | – | – | – |
| weekly | 30d | ±5 | 20 | 92% d21 | 76% d21 | 50% d21 |
| weekly | 30d | ±10 | 0 | 1% d7 | – | – |
| weekly | 30d | ±10 | 10 | 7% d21 | 4% d21 | 2% d14 |
| weekly | 30d | ±10 | 20 | 80% d21 | 65% d21 | 55% d21 |
| weekly | 365d | ±5 | 0 | – | – | – |
| weekly | 365d | ±5 | 10 | – | – | – |
| weekly | 365d | ±5 | 20 | 100% d21 | 97% d35 | 65% d42 |
| weekly | 365d | ±10 | 0 | – | – | – |
| weekly | 365d | ±10 | 10 | 3% d35 | 2% d35 | – |
| weekly | 365d | ±10 | 20 | 99% d21 | 92% d28 | 79% d35 |
| weekly | 60d | ±5 | 0 | – | – | – |
| weekly | 60d | ±5 | 10 | – | – | – |
| weekly | 60d | ±5 | 20 | 92% d21 | 64% d21 | 35% d21 |
| weekly | 60d | ±10 | 0 | – | – | – |
| weekly | 60d | ±10 | 10 | 3% d21 | – | – |
| weekly | 60d | ±10 | 20 | 87% d21 | 73% d21 | 49% d21 |
| daily | 120d | ±0 | 20 | 100% d21 | – | – |
| daily | 30d | ±0 | 20 | 100% d15 | 100% d18 | 100% d21 |
| daily | 365d | ±0 | 20 | 100% d21 | 100% d29 | – |
| daily | 60d | ±0 | 20 | 100% d19 | – | – |
## Main grid, 30 trials (bands 8 / 10 / 12)

Daily × 365-day noisy rows were still running when this was committed; its zero-noise row is in the edge table above.

### False opens (no drop, 60 days watched) — worst history per cell

| noise | cadence | MIN_BAND 8 | MIN_BAND 10 | MIN_BAND 12 |
|---|---|---|---|---|
| ±0 | daily | 0% | 0% | 0% |
| ±0 | 2d | 0% | 0% | 0% |
| ±0 | weekly | 0% | 0% | 0% |
| ±5 | daily | 0% | 0% | 0% |
| ±5 | 2d | 0% | 0% | 0% |
| ±5 | weekly | 0% | 0% | 0% |
| ±10 | daily | 0% | 0% | 0% |
| ±10 | 2d | 0% | 0% | 0% |
| ±10 | weekly | 7% | 3% | 0% |
| ±20 | daily | 0% | 0% | 0% |
| ±20 | 2d | 3% | 0% | 0% |
| ±20 | weekly | 10% | 7% | 3% |

### 10-pt dip (must never open) — worst history per cell

| noise | cadence | MIN_BAND 8 | MIN_BAND 10 | MIN_BAND 12 |
|---|---|---|---|---|
| ±0 | daily | 0% | 0% | 0% |
| ±0 | 2d | 0% | 0% | 0% |
| ±0 | weekly | 0% | 0% | 0% |
| ±5 | daily | 0% | 0% | 0% |
| ±5 | 2d | 7% | 0% | 0% |
| ±5 | weekly | 10% | 0% | 0% |
| ±10 | daily | 7% | 0% | 0% |
| ±10 | 2d | 13% | 0% | 0% |
| ±10 | weekly | 27% | 7% | 0% |
| ±20 | daily | 7% | 3% | 3% |
| ±20 | 2d | 37% | 23% | 10% |
| ±20 | weekly | 50% | 40% | 40% |

### Full grid — share opened in 60 days, median day of opening (`–` = never)

| cadence | history | noise | drop | B8 | B10 | B12 |
|---|---|---|---|---|---|---|
| daily | 30d | ±0 | 0 | – | – | – |
| daily | 30d | ±0 | 10 | – | – | – |
| daily | 30d | ±0 | 15 | 100% d17 | – | – |
| daily | 30d | ±0 | 20 | 100% d11 | 100% d15 | 100% d21 |
| daily | 30d | ±0 | 25 | 100% d8 | 100% d11 | 100% d14 |
| daily | 30d | ±5 | 0 | – | – | – |
| daily | 30d | ±5 | 10 | – | – | – |
| daily | 30d | ±5 | 15 | 100% d16 | 17% d21 | – |
| daily | 30d | ±5 | 20 | 100% d11 | 100% d16 | 70% d20 |
| daily | 30d | ±5 | 25 | 100% d8 | 100% d11 | 100% d14 |
| daily | 30d | ±10 | 0 | – | – | – |
| daily | 30d | ±10 | 10 | 7% d18 | – | – |
| daily | 30d | ±10 | 15 | 97% d16 | 27% d20 | – |
| daily | 30d | ±10 | 20 | 100% d12 | 100% d15 | 43% d20 |
| daily | 30d | ±10 | 25 | 100% d9 | 100% d11 | 100% d15 |
| daily | 30d | ±20 | 0 | – | – | – |
| daily | 30d | ±20 | 10 | 7% d1 | 3% d20 | 3% d21 |
| daily | 30d | ±20 | 15 | 13% d8 | 13% d8 | 10% d11 |
| daily | 30d | ±20 | 20 | 60% d11 | 60% d12 | 50% d16 |
| daily | 30d | ±20 | 25 | 97% d12 | 97% d12 | 93% d13 |
| daily | 60d | ±0 | 0 | – | – | – |
| daily | 60d | ±0 | 10 | – | – | – |
| daily | 60d | ±0 | 15 | 100% d21 | – | – |
| daily | 60d | ±0 | 20 | 100% d14 | 100% d19 | – |
| daily | 60d | ±0 | 25 | 100% d11 | 100% d14 | 100% d18 |
| daily | 60d | ±5 | 0 | – | – | – |
| daily | 60d | ±5 | 10 | – | – | – |
| daily | 60d | ±5 | 15 | 60% d20 | – | – |
| daily | 60d | ±5 | 20 | 100% d14 | 93% d19 | – |
| daily | 60d | ±5 | 25 | 100% d11 | 100% d14 | 100% d18 |
| daily | 60d | ±10 | 0 | – | – | – |
| daily | 60d | ±10 | 10 | – | – | – |
| daily | 60d | ±10 | 15 | 73% d20 | 7% d23 | – |
| daily | 60d | ±10 | 20 | 100% d15 | 97% d19 | 10% d20 |
| daily | 60d | ±10 | 25 | 100% d11 | 100% d13 | 100% d18 |
| daily | 60d | ±20 | 0 | – | – | – |
| daily | 60d | ±20 | 10 | – | – | – |
| daily | 60d | ±20 | 15 | 10% d20 | 10% d20 | – |
| daily | 60d | ±20 | 20 | 50% d19 | 50% d19 | 40% d20 |
| daily | 60d | ±20 | 25 | 90% d17 | 90% d17 | 77% d18 |
| daily | 120d | ±0 | 0 | – | – | – |
| daily | 120d | ±0 | 10 | – | – | – |
| daily | 120d | ±0 | 15 | – | – | – |
| daily | 120d | ±0 | 20 | 100% d16 | 100% d21 | – |
| daily | 120d | ±0 | 25 | 100% d12 | 100% d16 | 100% d20 |
| daily | 120d | ±5 | 0 | – | – | – |
| daily | 120d | ±5 | 10 | – | – | – |
| daily | 120d | ±5 | 15 | 83% d27 | – | – |
| daily | 120d | ±5 | 20 | 100% d16 | 100% d21 | – |
| daily | 120d | ±5 | 25 | 100% d12 | 100% d16 | 100% d20 |
| daily | 120d | ±10 | 0 | – | – | – |
| daily | 120d | ±10 | 10 | – | – | – |
| daily | 120d | ±10 | 15 | 73% d21 | – | – |
| daily | 120d | ±10 | 20 | 100% d15 | 97% d21 | 10% d21 |
| daily | 120d | ±10 | 25 | 100% d12 | 100% d16 | 100% d20 |
| daily | 120d | ±20 | 0 | – | – | – |
| daily | 120d | ±20 | 10 | – | – | – |
| daily | 120d | ±20 | 15 | 3% d26 | 3% d26 | – |
| daily | 120d | ±20 | 20 | 30% d21 | 30% d21 | 27% d22 |
| daily | 120d | ±20 | 25 | 83% d18 | 83% d18 | 77% d20 |
| daily | 365d | ±0 | 0 | pending | pending | pending |
| daily | 365d | ±0 | 10 | pending | pending | pending |
| daily | 365d | ±0 | 15 | pending | pending | pending |
| daily | 365d | ±0 | 20 | pending | pending | pending |
| daily | 365d | ±0 | 25 | pending | pending | pending |
| daily | 365d | ±5 | 0 | pending | pending | pending |
| daily | 365d | ±5 | 10 | pending | pending | pending |
| daily | 365d | ±5 | 15 | pending | pending | pending |
| daily | 365d | ±5 | 20 | pending | pending | pending |
| daily | 365d | ±5 | 25 | pending | pending | pending |
| daily | 365d | ±10 | 0 | pending | pending | pending |
| daily | 365d | ±10 | 10 | pending | pending | pending |
| daily | 365d | ±10 | 15 | pending | pending | pending |
| daily | 365d | ±10 | 20 | pending | pending | pending |
| daily | 365d | ±10 | 25 | pending | pending | pending |
| daily | 365d | ±20 | 0 | pending | pending | pending |
| daily | 365d | ±20 | 10 | pending | pending | pending |
| daily | 365d | ±20 | 15 | pending | pending | pending |
| daily | 365d | ±20 | 20 | pending | pending | pending |
| daily | 365d | ±20 | 25 | pending | pending | pending |
| 2d | 30d | ±0 | 0 | – | – | – |
| 2d | 30d | ±0 | 10 | – | – | – |
| 2d | 30d | ±0 | 15 | 100% d16 | – | – |
| 2d | 30d | ±0 | 20 | 100% d12 | 100% d16 | 100% d20 |
| 2d | 30d | ±0 | 25 | 100% d8 | 100% d12 | 100% d14 |
| 2d | 30d | ±5 | 0 | – | – | – |
| 2d | 30d | ±5 | 10 | 7% d20 | – | – |
| 2d | 30d | ±5 | 15 | 93% d18 | 20% d22 | – |
| 2d | 30d | ±5 | 20 | 100% d12 | 100% d16 | 90% d20 |
| 2d | 30d | ±5 | 25 | 100% d8 | 100% d12 | 100% d14 |
| 2d | 30d | ±10 | 0 | – | – | – |
| 2d | 30d | ±10 | 10 | 10% d20 | – | – |
| 2d | 30d | ±10 | 15 | 83% d18 | 30% d20 | 3% d18 |
| 2d | 30d | ±10 | 20 | 100% d12 | 97% d14 | 80% d18 |
| 2d | 30d | ±10 | 25 | 100% d8 | 100% d10 | 97% d14 |
| 2d | 30d | ±20 | 0 | 3% d2 | – | – |
| 2d | 30d | ±20 | 10 | 37% d14 | 23% d10 | 10% d10 |
| 2d | 30d | ±20 | 15 | 47% d10 | 40% d12 | 30% d14 |
| 2d | 30d | ±20 | 20 | 80% d14 | 77% d16 | 70% d20 |
| 2d | 30d | ±20 | 25 | 100% d12 | 100% d12 | 97% d14 |
| 2d | 60d | ±0 | 0 | – | – | – |
| 2d | 60d | ±0 | 10 | – | – | – |
| 2d | 60d | ±0 | 15 | 100% d22 | – | – |
| 2d | 60d | ±0 | 20 | 100% d14 | 100% d20 | – |
| 2d | 60d | ±0 | 25 | 100% d12 | 100% d14 | 100% d18 |
| 2d | 60d | ±5 | 0 | – | – | – |
| 2d | 60d | ±5 | 10 | – | – | – |
| 2d | 60d | ±5 | 15 | 83% d20 | – | – |
| 2d | 60d | ±5 | 20 | 100% d14 | 97% d20 | 13% d22 |
| 2d | 60d | ±5 | 25 | 100% d10 | 100% d14 | 100% d18 |
| 2d | 60d | ±10 | 0 | – | – | – |
| 2d | 60d | ±10 | 10 | – | – | – |
| 2d | 60d | ±10 | 15 | 80% d20 | 13% d20 | – |
| 2d | 60d | ±10 | 20 | 100% d14 | 90% d18 | 33% d22 |
| 2d | 60d | ±10 | 25 | 100% d12 | 100% d14 | 100% d18 |
| 2d | 60d | ±20 | 0 | – | – | – |
| 2d | 60d | ±20 | 10 | 3% d20 | 3% d20 | – |
| 2d | 60d | ±20 | 15 | 20% d18 | 20% d18 | 10% d20 |
| 2d | 60d | ±20 | 20 | 67% d18 | 63% d18 | 53% d18 |
| 2d | 60d | ±20 | 25 | 90% d16 | 90% d16 | 90% d18 |
| 2d | 120d | ±0 | 0 | – | – | – |
| 2d | 120d | ±0 | 10 | – | – | – |
| 2d | 120d | ±0 | 15 | 100% d24 | – | – |
| 2d | 120d | ±0 | 20 | 100% d16 | 100% d22 | – |
| 2d | 120d | ±0 | 25 | 100% d12 | 100% d16 | 100% d20 |
| 2d | 120d | ±5 | 0 | – | – | – |
| 2d | 120d | ±5 | 10 | – | – | – |
| 2d | 120d | ±5 | 15 | 93% d22 | – | – |
| 2d | 120d | ±5 | 20 | 100% d16 | 100% d22 | – |
| 2d | 120d | ±5 | 25 | 100% d12 | 100% d16 | 100% d20 |
| 2d | 120d | ±10 | 0 | – | – | – |
| 2d | 120d | ±10 | 10 | – | – | – |
| 2d | 120d | ±10 | 15 | 97% d22 | 20% d28 | – |
| 2d | 120d | ±10 | 20 | 100% d14 | 97% d20 | 43% d24 |
| 2d | 120d | ±10 | 25 | 100% d12 | 100% d16 | 100% d20 |
| 2d | 120d | ±20 | 0 | – | – | – |
| 2d | 120d | ±20 | 10 | – | – | – |
| 2d | 120d | ±20 | 15 | 13% d28 | 13% d28 | 7% d28 |
| 2d | 120d | ±20 | 20 | 53% d20 | 53% d20 | 43% d22 |
| 2d | 120d | ±20 | 25 | 97% d18 | 97% d18 | 90% d20 |
| 2d | 365d | ±0 | 0 | – | – | – |
| 2d | 365d | ±0 | 10 | – | – | – |
| 2d | 365d | ±0 | 15 | 100% d26 | – | – |
| 2d | 365d | ±0 | 20 | 100% d16 | 100% d22 | 100% d44 |
| 2d | 365d | ±0 | 25 | 100% d12 | 100% d16 | 100% d20 |
| 2d | 365d | ±5 | 0 | – | – | – |
| 2d | 365d | ±5 | 10 | – | – | – |
| 2d | 365d | ±5 | 15 | 100% d26 | 3% d60 | – |
| 2d | 365d | ±5 | 20 | 100% d16 | 100% d22 | 87% d38 |
| 2d | 365d | ±5 | 25 | 100% d12 | 100% d16 | 100% d20 |
| 2d | 365d | ±10 | 0 | – | – | – |
| 2d | 365d | ±10 | 10 | 13% d34 | – | – |
| 2d | 365d | ±10 | 15 | 100% d24 | 47% d38 | 7% d48 |
| 2d | 365d | ±10 | 20 | 100% d18 | 100% d22 | 87% d32 |
| 2d | 365d | ±10 | 25 | 100% d12 | 100% d16 | 100% d20 |
| 2d | 365d | ±20 | 0 | – | – | – |
| 2d | 365d | ±20 | 10 | – | – | – |
| 2d | 365d | ±20 | 15 | 23% d26 | 23% d26 | 20% d32 |
| 2d | 365d | ±20 | 20 | 60% d32 | 60% d32 | 57% d34 |
| 2d | 365d | ±20 | 25 | 100% d18 | 100% d18 | 100% d20 |
| weekly | 30d | ±0 | 0 | – | – | – |
| weekly | 30d | ±0 | 10 | – | – | – |
| weekly | 30d | ±0 | 15 | 100% d21 | – | – |
| weekly | 30d | ±0 | 20 | 100% d14 | 100% d21 | 100% d21 |
| weekly | 30d | ±0 | 25 | 100% d14 | 100% d14 | 100% d21 |
| weekly | 30d | ±5 | 0 | – | – | – |
| weekly | 30d | ±5 | 10 | 10% d21 | – | – |
| weekly | 30d | ±5 | 15 | 87% d21 | 13% d21 | – |
| weekly | 30d | ±5 | 20 | 100% d14 | 87% d21 | 50% d21 |
| weekly | 30d | ±5 | 25 | 100% d14 | 100% d14 | 100% d14 |
| weekly | 30d | ±10 | 0 | 7% d7 | 3% d7 | – |
| weekly | 30d | ±10 | 10 | 23% d21 | 7% d21 | – |
| weekly | 30d | ±10 | 15 | 80% d21 | 47% d21 | 10% d21 |
| weekly | 30d | ±10 | 20 | 100% d14 | 77% d21 | 47% d21 |
| weekly | 30d | ±10 | 25 | 100% d14 | 100% d14 | 87% d14 |
| weekly | 30d | ±20 | 0 | 10% d14 | 7% d7 | 3% d7 |
| weekly | 30d | ±20 | 10 | 50% d7 | 40% d7 | 40% d7 |
| weekly | 30d | ±20 | 15 | 60% d21 | 50% d21 | 43% d21 |
| weekly | 30d | ±20 | 20 | 80% d14 | 77% d21 | 73% d21 |
| weekly | 30d | ±20 | 25 | 100% d14 | 100% d14 | 90% d14 |
| weekly | 60d | ±0 | 0 | – | – | – |
| weekly | 60d | ±0 | 10 | – | – | – |
| weekly | 60d | ±0 | 15 | 100% d21 | – | – |
| weekly | 60d | ±0 | 20 | 100% d14 | 100% d21 | – |
| weekly | 60d | ±0 | 25 | 100% d14 | 100% d14 | 100% d21 |
| weekly | 60d | ±5 | 0 | – | – | – |
| weekly | 60d | ±5 | 10 | – | – | – |
| weekly | 60d | ±5 | 15 | 90% d21 | 7% d21 | – |
| weekly | 60d | ±5 | 20 | 100% d14 | 90% d21 | 27% d21 |
| weekly | 60d | ±5 | 25 | 100% d14 | 100% d14 | 100% d21 |
| weekly | 60d | ±10 | 0 | – | – | – |
| weekly | 60d | ±10 | 10 | 17% d35 | – | – |
| weekly | 60d | ±10 | 15 | 73% d21 | 37% d21 | 7% d21 |
| weekly | 60d | ±10 | 20 | 100% d21 | 87% d21 | 37% d28 |
| weekly | 60d | ±10 | 25 | 100% d14 | 100% d14 | 93% d21 |
| weekly | 60d | ±20 | 0 | 3% d28 | – | – |
| weekly | 60d | ±20 | 10 | 40% d14 | 37% d14 | 17% d21 |
| weekly | 60d | ±20 | 15 | 73% d14 | 60% d21 | 43% d21 |
| weekly | 60d | ±20 | 20 | 70% d21 | 70% d21 | 70% d21 |
| weekly | 60d | ±20 | 25 | 93% d14 | 93% d14 | 90% d21 |
| weekly | 120d | ±0 | 0 | – | – | – |
| weekly | 120d | ±0 | 10 | – | – | – |
| weekly | 120d | ±0 | 15 | 100% d35 | – | – |
| weekly | 120d | ±0 | 20 | 100% d21 | 100% d21 | – |
| weekly | 120d | ±0 | 25 | 100% d14 | 100% d21 | 100% d21 |
| weekly | 120d | ±5 | 0 | – | – | – |
| weekly | 120d | ±5 | 10 | – | – | – |
| weekly | 120d | ±5 | 15 | 70% d21 | 7% d28 | – |
| weekly | 120d | ±5 | 20 | 100% d21 | 93% d21 | 17% d35 |
| weekly | 120d | ±5 | 25 | 100% d14 | 100% d21 | 100% d21 |
| weekly | 120d | ±10 | 0 | – | – | – |
| weekly | 120d | ±10 | 10 | 27% d28 | – | – |
| weekly | 120d | ±10 | 15 | 87% d21 | 50% d28 | 7% d28 |
| weekly | 120d | ±10 | 20 | 100% d21 | 97% d28 | 53% d28 |
| weekly | 120d | ±10 | 25 | 100% d14 | 100% d21 | 100% d21 |
| weekly | 120d | ±20 | 0 | 7% d21 | 3% d42 | 3% d49 |
| weekly | 120d | ±20 | 10 | 33% d21 | 30% d21 | 13% d14 |
| weekly | 120d | ±20 | 15 | 53% d28 | 53% d28 | 40% d28 |
| weekly | 120d | ±20 | 20 | 77% d21 | 77% d21 | 70% d21 |
| weekly | 120d | ±20 | 25 | 83% d21 | 83% d21 | 80% d21 |
| weekly | 365d | ±0 | 0 | – | – | – |
| weekly | 365d | ±0 | 10 | – | – | – |
| weekly | 365d | ±0 | 15 | 100% d28 | – | – |
| weekly | 365d | ±0 | 20 | 100% d21 | 100% d21 | – |
| weekly | 365d | ±0 | 25 | 100% d14 | 100% d21 | 100% d21 |
| weekly | 365d | ±5 | 0 | – | – | – |
| weekly | 365d | ±5 | 10 | – | – | – |
| weekly | 365d | ±5 | 15 | 100% d28 | 30% d42 | – |
| weekly | 365d | ±5 | 20 | 100% d21 | 100% d28 | 57% d42 |
| weekly | 365d | ±5 | 25 | 100% d14 | 100% d21 | 100% d21 |
| weekly | 365d | ±10 | 0 | – | – | – |
| weekly | 365d | ±10 | 10 | 20% d35 | 3% d35 | – |
| weekly | 365d | ±10 | 15 | 100% d28 | 73% d35 | 13% d35 |
| weekly | 365d | ±10 | 20 | 100% d21 | 100% d28 | 80% d35 |
| weekly | 365d | ±10 | 25 | 100% d14 | 100% d21 | 100% d21 |
| weekly | 365d | ±20 | 0 | – | – | – |
| weekly | 365d | ±20 | 10 | 17% d21 | 17% d21 | 13% d21 |
| weekly | 365d | ±20 | 15 | 43% d28 | 43% d28 | 40% d35 |
| weekly | 365d | ±20 | 20 | 83% d21 | 83% d21 | 80% d21 |
| weekly | 365d | ±20 | 25 | 100% d21 | 100% d21 | 100% d21 |
