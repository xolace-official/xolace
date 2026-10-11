/**
 * #535 item 4: how long a stretch holds under each anchor cap, on the real engine.
 * Steady 70 for HISTORY days, then 70 − DROP for DIP days (Infinity = a permanent
 * shift), then back to 70. The stretch opens at the first opens(); judgeWith(C)
 * mirrors judgeOpen with ANCHOR_CAP = C days (parity asserted at 90). Reports the
 * drop-day each cap ends the stretch on (null = still open at WATCH days).
 */
import { bandOf, judgeOpen, opens } from "../../../convex/compounding/detect";
import { computeSteadiness, type DomainSteadiness, type Reading } from "../../../convex/compounding/steadiness";

const DAY = 86_400_000;
const TZ = "UTC";
const STEADY = 70;
const WATCH = 365;
const TRIALS = Number(process.env.TRIALS ?? 20);
const CAPS = process.env.CAPS ? process.env.CAPS.split(",").map(Number) : [30, 45, 60, 90];
const HISTORIES = process.env.HISTORY ? [Number(process.env.HISTORY)] : [60, 120, 365];
const DIPS = process.env.DIPS ? process.env.DIPS.split(",").map(Number) : [30, 60, 90, Infinity];
const DROP = Number(process.env.DROP ?? 20);
const NOISES = process.env.NOISES ? process.env.NOISES.split(",").map(Number) : [0, 5, 10];
const CADENCES: [string, number][] = ([["daily", 1], ["2d", 2], ["weekly", 7]] as [string, number][]).filter(
  ([c]) => !process.env.CADENCE || c === process.env.CADENCE,
);

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function endsWith(d: DomainSteadiness, stretch: { startedAt: number; anchorBaseline: number }, now: number, capDays: number) {
  const baseline = now - stretch.startedAt < capDays * DAY ? stretch.anchorBaseline : d.raw.baseline;
  return baseline - d.raw.steadiness < bandOf(d, stretch.startedAt) / 2;
}

function trial(history: number, dip: number, noise: number, cadence: number, seed: number) {
  const rand = rng(seed);
  const start = Date.UTC(2026, 0, 1);
  const v = (base: number) => Math.min(100, Math.max(0, base + (rand() * 2 - 1) * noise));
  const mk = (at: number, value: number): Reading => ({ domain: "work", value, weight: 1, at, source: "session" });
  const readings: Reading[] = [];
  for (let day = history; day >= 1; day -= cadence) readings.push(mk(start - (day - 0.5) * DAY, v(STEADY)));
  let stretch: { startedAt: number; anchorBaseline: number } | null = null;
  let openedDay: number | null = null;
  const ended: (number | null)[] = CAPS.map(() => null);
  for (let day = cadence; day <= WATCH; day += cadence) {
    const at = start + (day - 0.5) * DAY;
    readings.push(mk(at, v(day <= dip ? STEADY - DROP : STEADY)));
    const d = computeSteadiness(readings, { now: at, timezone: TZ }).domains[0];
    if (!stretch) {
      if (opens(d, { now: at, timezone: TZ })) {
        stretch = { startedAt: at, anchorBaseline: d.raw.baseline };
        openedDay = day;
      }
      continue;
    }
    CAPS.forEach((C, i) => {
      if (ended[i] !== null) return;
      const e = endsWith(d, stretch!, at, C);
      if (C === 90 && e !== ("ended" in judgeOpen(d, stretch!, { now: at, timezone: TZ }))) throw new Error("parity broken");
      if (e) ended[i] = day;
    });
    if (ended.every((x) => x !== null)) break;
  }
  return { openedDay, ended };
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
      for (const dip of DIPS) {
        const n = noise === 0 ? 1 : TRIALS;
        const res = Array.from({ length: n }, (_, s) => trial(history, dip, noise, cadence, s + 1 + history * 7919 + noise * 31 + cadence * 3));
        const opened = res.filter((r) => r.openedDay !== null);
        const row: Record<string, unknown> = { cadence: cname, history, noise, dip: dip === Infinity ? "perm" : dip, opened: opened.length / n, openDay: median(opened.map((r) => r.openedDay!)) };
        CAPS.forEach((C, i) => {
          const days = opened.map((r) => r.ended[i]);
          const done = days.filter((x): x is number => x !== null);
          row[`end${C}`] = median(done);
          row[`open${C}`] = opened.length ? (days.length - done.length) / opened.length : null;
        });
        rows.push(row);
      }
console.log(JSON.stringify(rows));
