/**
 * Test-only stand-in for `react-native-reanimated` (its native module doesn't load in vitest):
 * each animation call returns a plain description, so a test can read what the motion
 * helpers asked for. Use with `vi.mock("react-native-reanimated", () => import(...))`.
 */

export const ReduceMotion = {
	Always: "always",
	Never: "never",
	System: "system",
} as const;

export const Easing = {
	bezier: (...curve: number[]) => ({ bezier: curve }),
};

export const withTiming = (to: number, config?: object) => ({
	config,
	kind: "timing",
	to,
});

export const withSpring = (to: number, config?: object) => ({
	config,
	kind: "spring",
	to,
});

export const withDelay = (
	delay: number,
	animation: object,
	reduceMotion?: string
) => ({
	animation,
	delay,
	kind: "delay",
	reduceMotion,
});

class LayoutBuilder {
	ms: number | undefined;
	motion: string | undefined;

	duration(ms: number) {
		this.ms = ms;
		return this;
	}

	reduceMotion(motion: string) {
		this.motion = motion;
		return this;
	}
}

export const FadeIn = {
	duration: (ms: number) => new LayoutBuilder().duration(ms),
};
