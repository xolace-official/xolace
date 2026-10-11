/**
 * #528: MIN_BAND grid on the real engine (post-#527).
 * Steady 70, then a sustained drop for up to 60 days; opens() evaluated at every landing session.
 * opensWith(B) mirrors opens() with MIN_BAND = B; parity with the real opens() (production MIN_BAND = 10) is asserted at B = 10.
 */
import { opens } from "../../../convex/compounding/detect";
import {
  BASELINE_HALF_LIFE_DAYS,
  computeSteadiness,
  decayedMean,
  usualOf,
  type DomainSteadiness,
  type Reading,
} from "../../../convex/compounding/steadiness";

const DAY = 86_400_000;
const TZ = "UTC";
const STEADY = 70;
const WINDOW = 60;
const TRIALS = Number(process.env.TRIALS ?? 40);
const BANDS = process.env.BANDS ? process.env.BANDS.split(",").map(Number) : [8, 10, 12];
const HISTORIES = process.env.HISTORY ? [Number(process.env.HISTORY)] : [30, 60, 120, 365];
const DROPS = process.env.DROPS ? process.env.DROPS.split(",").map(Number) : [0, 10, 15, 20, 25];
const NOISES = process.env.NOISES ? process.env.NOISES.split(",").map(Number) : [0, 5, 10, 20];
const CADENCES: [string, number][] = ([["daily", 1], ["2d", 2], ["weekly", 7]] as [string, number][]).filter(([c]) => !process.env.CADENCE || c === process.env.CADENCE);

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function opensWith(d: DomainSteadiness, now: number, B: number): boolean {
  if (d.state !== "settled") return false;
  const usual = usualOf(d.readings, now);
  const band = usual.length ? Math.max(B, decayedMean(usual, now, BASELINE_HALF_LIFE_DAYS).sd) : B;
  if (d.raw.baseline - d.raw.steadiness <= band) return false;
  const days = new Set(
    d.readings
      .filter((r) => r.source === "session" && r.at > now - 21 * DAY && r.value < d.raw.baseline)
      .map((r) => Math.floor(r.at / DAY)),
  );
  return days.size >= 2;
}

/** First drop-day each band opens on, or null within WINDOW. */
function trial(history: number, drop: number, noise: number, cadence: number, seed: number) {
  const rand = rng(seed);
  const start = Date.UTC(2026, 0, 1);
  const v = (base: number) => Math.min(100, Math.max(0, base + (rand() * 2 - 1) * noise));
  const mk = (at: number, value: number): Reading => ({ domain: "work", value, weight: 1, at, source: "session" });
  const readings: Reading[] = [];
  for (let day = history; day >= 1; day -= cadence) readings.push(mk(start - (day - 0.5) * DAY, v(STEADY)));
  const first: (number | null)[] = BANDS.map(() => null);
  for (let day = cadence; day <= WINDOW; day += cadence) {
    const at = start + (day - 0.5) * DAY;
    readings.push(mk(at, v(STEADY - drop)));
    const d = computeSteadiness(readings, { now: at, timezone: TZ }).domains[0];
    BANDS.forEach((B, i) => {
      const o = opensWith(d, at, B);
      if (B === 10 && o !== opens(d, { now: at, timezone: TZ })) throw new Error("parity broken");
      if (o && first[i] === null) first[i] = day;
    });
    if (first.every((f) => f !== null)) break;
  }
  return first;
}

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor((s.length - 1) / 2)];
};

const rows: Record<string, unknown>[] = [];
for (const [cname, cadence] of CADENCES)
  for (const history of HISTORIES)
    for (const noise of NOISES)
      for (const drop of DROPS) {
        const n = noise === 0 ? 1 : TRIALS;
        const res = Array.from({ length: n }, (_, s) => trial(history, drop, noise, cadence, s + 1 + history * 7919 + drop * 104729 + noise * 31 + cadence * 3));
        const row: Record<string, unknown> = { cadence: cname, history, noise, drop };
        BANDS.forEach((B, i) => {
          const opened = res.map((r) => r[i]).filter((x): x is number => x !== null);
          row[`open${B}`] = opened.length / n;
          row[`med${B}`] = median(opened);
        });
        rows.push(row);
      }
console.log(JSON.stringify(rows));
