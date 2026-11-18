import { beforeEach, describe, expect, it, vi } from "vitest";
import { burnFromFlashPattern, burnPattern } from "./burn";
import * as android from "./haptics";
import * as ios from "./haptics.ios";
import { type HapticName, hapticNames } from "./haptics.types";
import * as patterns from "./haptics-patterns.ios";

/**
 * Pins how each named haptic feels on each platform. The redesign plays these names (the
 * prototype dropped its own vocabulary to match production), so a ported screen inherits
 * production's feel only while this table holds.
 */

const played: string[] = [];

vi.mock("react-native-pulsar", () => {
	const preset = (path: string) => () => {
		played.push(path);
	};
	return {
		Presets: new Proxy(
			{},
			{ get: (_, name) => preset(`Presets.${String(name)}`) }
		),
		usePatternComposer: () => ({ play: preset("pattern") }),
	};
});
vi.mock("@/modules/native-core-haptics", () => ({
	default: {
		impact: async () => {
			played.push("CoreHaptics.impact");
		},
		playPattern: async (pattern: unknown) => {
			played.push(
				`CoreHaptics.${Object.entries(patterns).find(([, p]) => p === pattern)?.[0]}`
			);
		},
	},
}));

/** Android (and web): each name on a Pulsar preset. */
const ANDROID: Record<HapticName, string> = {
	affirmativePress: "strike",
	compassionateHold: "pendulum",
	errorNotice: "wobble",
	followUpEntrance: "bellToll",
	gentlePresence: "feather",
	homeEntrance: "thud",
	mirrorArrival: "herald",
	onboardingEntrance: "cascade",
	pathChoice: "cadence",
	processingBreath: "breath",
	resonanceToggle: "chirp",
	sessionComplete: "bloom",
	softenPulse: "sway",
	softPress: "push",
	textureSelect: "flick",
	typingBegin: "thud",
};

beforeEach(() => {
	played.length = 0;
});

describe("haptics", () => {
	it("names every haptic once on each platform", () => {
		expect(Object.keys(ANDROID).sort()).toEqual([...hapticNames].sort());
	});

	for (const name of hapticNames) {
		it(`${name}: Presets.${ANDROID[name]} on Android`, () => {
			android.playHaptic(name);
			expect(played).toEqual([`Presets.${ANDROID[name]}`]);
		});

		it(`${name}: its own CoreHaptics pattern on iOS`, () => {
			ios.playHaptic(name);
			// followUpEntrance is the one iOS haptic on a Pulsar preset (#499).
			expect(played).toEqual([
				name === "followUpEntrance"
					? "Presets.bellToll"
					: `CoreHaptics.${name}`,
			]);
		});
	}

	it("tap: a light flick on Android, a CoreHaptics impact on iOS", () => {
		android.tap();
		ios.tap();
		expect(played).toEqual(["Presets.flick", "CoreHaptics.impact"]);
	});

	it("the breath phases", () => {
		for (const phase of ["inhale", "top", "exhale"] as const) {
			android.playBreathPhase(phase, 4000);
		}
		ios.playBreathPhase("top", 0);
		expect(played).toEqual([
			"Presets.breath",
			"Presets.pip",
			"Presets.wave",
			"CoreHaptics.breathTopHold",
		]);
	});
});

/** Vent's burn (vent.md §14): gather 600 ms, flash 140 ms, as `useBurnHaptic(600, 140)` plays it. */
describe("the vent burn", () => {
	const GATHER_MS = 600;
	const FLASH_MS = 140;
	const ticks = burnPattern(GATHER_MS, FLASH_MS).discretePattern;
	const flash = ticks.find((t) => t.time === GATHER_MS && t.amplitude === 1);
	const gather = ticks.filter((t) => t.time < GATHER_MS);
	const crackle = ticks.filter((t) => t.time >= GATHER_MS + FLASH_MS);

	it("ticks faster and harder through the gather", () => {
		expect(gather[0]).toMatchObject({ amplitude: 0.25, time: 0 });
		const gaps = gather.slice(1).map((t, i) => t.time - (gather[i]?.time ?? 0));
		expect(gaps.every((g, i) => i === 0 || g < (gaps[i - 1] ?? 0))).toBe(true);
		expect(gather.at(-1)?.amplitude).toBeGreaterThan(0.5);
	});

	it("lands one heavy transient on the flash", () => {
		expect(flash).toMatchObject({ amplitude: 1, frequency: 0.3 });
	});

	it("crackles from the flash's end, fading to nothing within 1.4 s", () => {
		expect(crackle[0]).toMatchObject({ amplitude: 0.55, time: 740 });
		expect(crackle.at(-1)?.time).toBeLessThan(740 + 1400);
		expect(crackle.at(-1)?.amplitude).toBeLessThan(0.1);
	});

	it("is the same every time, and a pinch plays it from the flash", () => {
		expect(burnPattern(GATHER_MS, FLASH_MS)).toEqual(
			burnPattern(GATHER_MS, FLASH_MS)
		);
		const pinched = burnFromFlashPattern(FLASH_MS).discretePattern;
		expect(pinched[0]).toMatchObject({ amplitude: 1, time: 0 });
		expect(pinched.slice(1).map((t) => t.time + GATHER_MS)).toEqual(
			crackle.map((t) => t.time)
		);
	});
});
