export type Sample = { x: number; y: number; z: number };

/** Jolt magnitude in g, gravity-removed (`|‖a‖ - 1|`, tilt-invariant). Walking
 * peaks ~0.45, a pocket ~0.72, a shake 2.3+; 0.85 is about a 1.5g flick. */
const JOLT_G = 0.85;
/** Re-arm below this, so one long spike counts once (hysteresis). */
const REARM_G = JOLT_G * 0.5;
/** Jolt events needed inside WINDOW_MS: a shake oscillates, a knock produces one. */
const REQUIRED_JOLTS = 3;
const WINDOW_MS = 1000;
/** Quiet period after a hit, so one continuous shake fires exactly once. */
const COOLDOWN_MS = 1500;

/** Stateful shake detector; `push` returns true on the sample that completes a
 * shake. Time-injected and platform-free so traces can be replayed in tests. */
export function createShakeDetector() {
	let jolts: number[] = [];
	let armed = true;
	let lastFire = Number.NEGATIVE_INFINITY;

	return (sample: Sample, now: number): boolean => {
		const jolt = Math.abs(Math.hypot(sample.x, sample.y, sample.z) - 1);
		if (jolt < REARM_G) {
			armed = true;
		}
		if (jolt < JOLT_G || !armed) {
			return false;
		}
		if (now - lastFire < COOLDOWN_MS) {
			return false;
		}

		armed = false;
		jolts = jolts.filter((t) => now - t < WINDOW_MS);
		jolts.push(now);
		if (jolts.length < REQUIRED_JOLTS) {
			return false;
		}

		jolts = [];
		lastFire = now;
		return true;
	};
}
