import { Easing } from "react-native-reanimated";

export const KMOTION = {
	badge: { damping: 13, stiffness: 260 },
	dimMs: 400,
	easeIn: Easing.bezier(0.4, 0, 1, 1),
	eyebrowMs: 200,
	fireCatchMs: 300,
	fireGlowMs: 900,
	goldMs: 250,
	haloMs: 4000,
	heightMs: 340,
	inDelay: 100,
	inMs: 300,
	inRise: 10,
	liftMs: 300,
	lit: Easing.bezier(0.23, 1, 0.32, 1),
	litMs: 300,
	openMs: 200,
	openScale: 1.06,
	outMs: 160,
	outRise: -6,
	rowMs: 280,
	rowRise: 4,
	swapMs: 500,
	swapRise: 8,
} as const;

export const FIRE_GLOW = [0.1, 0.22, 0.34, 0.46, 0.58] as const;
