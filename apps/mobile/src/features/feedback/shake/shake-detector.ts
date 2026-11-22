export type Sample = { x: number; y: number; z: number };

const JOLT_G = 0.85;
const REARM_G = JOLT_G * 0.5;
const REQUIRED_JOLTS = 3;
const WINDOW_MS = 1000;
const COOLDOWN_MS = 1500;

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
