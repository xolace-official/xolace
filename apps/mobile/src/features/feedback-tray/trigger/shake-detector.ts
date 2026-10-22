export type Sample = { x: number; y: number; z: number };

/**
 * Jolt magnitude in g, gravity-removed. At rest the accelerometer reads a 1g
 * gravity vector in *some* direction, so `|‖a‖ - 1|` is ~0 however the phone is
 * held and stays ~0 through a tilt (which only rotates that vector). Only real
 * linear acceleration moves it: walking peaks ~0.45, a pocket ~0.7, a
 * deliberate shake 2.3+. Set just above the loudest incidental motion (pocket
 * jostling, ~0.72) rather than near a shake's peak, so a half-hearted wrist
 * flick still registers. Gravity adds in quadrature, so a shake of amplitude
 * `a` only reads ~sqrt(1 + 1.1a²) - 1 here — 0.85 is about a 1.5g flick,
 * where the old 1.4 gate needed ~2.1g.
 */
const JOLT_G = 0.85;
/** Re-arm below this, so one long spike counts once (hysteresis). */
const REARM_G = JOLT_G * 0.5;
/**
 * Jolt *events* needed inside WINDOW_MS. A shake oscillates and produces one
 * per half-cycle; a knock or a set-down produces exactly one, however hard.
 */
const REQUIRED_JOLTS = 3;
const WINDOW_MS = 1000;
/** Quiet period after a hit, so one continuous shake fires exactly once. */
const COOLDOWN_MS = 1500;

/**
 * Stateful shake detector. `push` returns true on the sample that completes a
 * qualifying shake; the window clears on a hit so a continuing shake does not
 * immediately re-fire.
 *
 * Time-injected and free of platform APIs so it can be replayed against
 * recorded or synthetic accelerometer traces — see shake-detector.test.ts.
 */
export function createShakeDetector() {
  let jolts: number[] = [];
  let armed = true;
  let lastFire = -Infinity;

  return (sample: Sample, now: number): boolean => {
    const jolt = Math.abs(Math.hypot(sample.x, sample.y, sample.z) - 1);
    if (jolt < REARM_G) armed = true;
    if (jolt < JOLT_G || !armed) return false;
    if (now - lastFire < COOLDOWN_MS) return false;

    armed = false;
    jolts = jolts.filter((t) => now - t < WINDOW_MS);
    jolts.push(now);
    if (jolts.length < REQUIRED_JOLTS) return false;

    jolts = [];
    lastFire = now;
    return true;
  };
}
