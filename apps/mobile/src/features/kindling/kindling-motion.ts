import { Easing } from "react-native-reanimated";

/** Kindling v2's timings (handoff §3, §4, §6), in one place. */
export const KMOTION = {
	/** The check badge springs in. */
	badge: { damping: 13, stiffness: 260 },
	/** Dimming a later twig, and lifting it when it becomes the suggestion. */
	dimMs: 400,
	easeIn: Easing.bezier(0.4, 0, 1, 1),
	eyebrowMs: 200,
	fireCatchMs: 300,
	/** The fire's glow follows the lit legs, and goes full when it catches. */
	fireGlowMs: 900,
	/** The tend's gold fades in when the spark can't run (§4). */
	goldMs: 250,
	/** The open stop's halo breathes on a 4 s loop. */
	haloMs: 4000,
	heightMs: 340,
	inDelay: 100,
	inMs: 300,
	inRise: 10,
	liftMs: 300,
	/** fuse-burn's `lit` and label ease: bezier(.23, 1, .32, 1). */
	lit: Easing.bezier(0.23, 1, 0.32, 1),
	litMs: 300,
	openMs: 200,
	openScale: 1.06,
	/** The card switch (§6). */
	outMs: 160,
	outRise: -6,
	rowMs: 280,
	rowRise: 4,
	/** The eyebrow swap, as fuse's "Light it up" → "You're in". */
	swapMs: 500,
	swapRise: 8,
} as const;

/** The fire's glow by lit legs, for 0, 1, 2… lit (§5); past the list it holds the last. */
export const FIRE_GLOW = [0.1, 0.22, 0.34, 0.46, 0.58] as const;
