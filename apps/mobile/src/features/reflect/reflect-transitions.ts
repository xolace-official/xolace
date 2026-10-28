import type { ReflectionStateName } from "@/features/reflect/types";

/** Reanimated's default easing: Easing.inOut(Easing.quad) as cubic bezier */
const QUAD_EASE_IN_OUT: [number, number, number, number] = [
	0.455, 0.03, 0.515, 0.955,
];

type AnimateProps = {
	opacity?: number;
	translateX?: number;
	translateY?: number;
	scale?: number;
};

type TimingTransition = {
	type: "timing";
	duration: number;
	easing?:
		| "linear"
		| "easeIn"
		| "easeOut"
		| "easeInOut"
		| [number, number, number, number];
};

type SpringTransition = {
	type: "spring";
	damping: number;
	stiffness: number;
	mass?: number;
};

type Transition = TimingTransition | SpringTransition;

export type ScreenTransitionConfig = {
	enter: {
		initialAnimate: AnimateProps;
		animate: AnimateProps;
		transition: Transition;
	};
	exit: {
		transition: TimingTransition;
	};
};

/**
 * Maps idle, typing and typing-nudge onto one compose screen (#256); a cross-fade breaks the morph.
 */
export function normalizeScreen(
	screen: ReflectionStateName
): ReflectionStateName {
	return screen === "typing-nudge" || screen === "idle" ? "typing" : screen;
}

const fade = (
	enterDuration: number,
	exitDuration: number
): ScreenTransitionConfig => ({
	enter: {
		animate: { opacity: 1 },
		initialAnimate: { opacity: 0 },
		transition: {
			duration: enterDuration,
			easing: QUAD_EASE_IN_OUT,
			type: "timing",
		},
	},
	exit: {
		transition: {
			duration: exitDuration,
			easing: QUAD_EASE_IN_OUT,
			type: "timing",
		},
	},
});

export const DEFAULT_SCREEN_TRANSITION: ScreenTransitionConfig = fade(400, 300);

export const SCREEN_TRANSITIONS: Record<
	ReflectionStateName,
	ScreenTransitionConfig
> = {
	clarify: fade(400, 500),
	error: fade(600, 500),
	escalation: fade(900, 600),
	"gave-up": fade(600, 500),
	idle: fade(400, 300),
	mirror: {
		enter: {
			animate: { opacity: 1, translateY: 0 },
			initialAnimate: { opacity: 0, translateY: -30 },
			transition: { damping: 18, stiffness: 100, type: "spring" },
		},
		exit: {
			transition: { duration: 500, easing: QUAD_EASE_IN_OUT, type: "timing" },
		},
	},
	"path-selection": fade(600, 500),
	processing: fade(800, 600),
	typing: fade(400, 500),
	"typing-nudge": fade(400, 500),
};
