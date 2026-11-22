import { describe, expect, it } from "vitest";
import { createShakeDetector, type Sample } from "./shake-detector";

const DT = 25;
const T0 = 1_700_000_000_000;

const noise = (n: number) => (Math.sin(n * 12.9898) * 43_758.5453) % 1;

type Trace = (Sample & { t: number })[];

function build(ms: number, fn: (s: number, i: number) => Sample): Trace {
	const out: Trace = [];
	for (let i = 0, t = 0; t < ms; i++, t += DT) {
		out.push({ t, ...fn(t / 1000, i) });
	}
	return out;
}

const rest = build(3000, (_s, i) => ({
	x: 0.004 * noise(i),
	y: 0.004 * noise(i + 7),
	z: -1,
}));

const pickUp = build(2000, (s, i) => {
	const th = (Math.min(s / 0.4, 1) * Math.PI) / 2;
	const lift = s < 0.4 ? 0.45 * Math.sin((s / 0.4) * 2 * Math.PI) : 0;
	return { x: 0.02 * noise(i), y: -Math.sin(th), z: -Math.cos(th) - lift };
});

const flip = build(1500, (s, i) => {
	const th = (Math.min(s / 0.25, 1) * Math.PI) / 2;
	return { x: -Math.sin(th), y: -Math.cos(th), z: 0.03 * noise(i) };
});

const walking = build(4000, (s) => ({
	x: 0.2 * Math.sin(2 * Math.PI * 2 * s + 1),
	y: -1 + 0.45 * Math.sin(2 * Math.PI * 2 * s),
	z: 0.25 * Math.sin(2 * Math.PI * 4 * s),
}));

const pocket = build(2000, (s, i) => ({
	x: 0.5 * Math.sin(2 * Math.PI * 3 * s) + 0.1 * noise(i),
	y: -0.9 + 0.5 * Math.sin(2 * Math.PI * 2.3 * s),
	z: -0.4 + 0.4 * Math.sin(2 * Math.PI * 5 * s),
}));

const knock = build(1500, (s) => {
	const spike =
		s > 0.5 && s < 0.6 ? 2.5 * Math.sin(((s - 0.5) / 0.1) * Math.PI) : 0;
	return { x: 0, y: 0, z: -1 - spike };
});

const shake = build(1600, (s) => {
	const a = s < 1.2 ? 3 : 0;
	const w = Math.sin(2 * Math.PI * 4 * s);
	return { x: a * w, y: -1, z: 0.3 * a * w };
});

const gentleShake = build(1600, (s) => {
	const a = s < 1 ? 2 : 0;
	const w = Math.sin(2 * Math.PI * 4 * s);
	return { x: a * w, y: -1, z: 0.3 * a * w };
});

function countFires(trace: Trace) {
	const detect = createShakeDetector();
	return trace.filter((s) => detect(s, T0 + s.t)).length;
}

describe("createShakeDetector", () => {
	it.each([
		["at rest on a table", rest],
		["being picked up off a table", pickUp],
		["flipped to landscape", flip],
		["carried while walking", walking],
		["jostling in a pocket", pocket],
		["knocked once, hard", knock],
	])("does not fire when %s", (_name, trace) => {
		expect(countFires(trace)).toBe(0);
	});

	it("fires on a deliberate shake", () => {
		expect(countFires(shake)).toBe(1);
	});

	it("fires on a half-hearted wrist flick", () => {
		expect(countFires(gentleShake)).toBe(1);
	});

	it("needs a fresh window to fire again, not just more samples", () => {
		const detect = createShakeDetector();
		const fireTimes = shake.filter((s) => detect(s, T0 + s.t)).map((s) => s.t);
		expect(fireTimes).toHaveLength(1);
		expect(fireTimes[0]).toBeGreaterThan(200);
	});
});
