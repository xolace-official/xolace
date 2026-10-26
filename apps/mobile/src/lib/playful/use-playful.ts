import { useSharedValue, withTiming } from "react-native-reanimated";
import { useAppTheme } from "@/src/context/app-theme-context";
import { useEffectiveReducedMotion } from "@/src/lib/motion/use-effective-reduced-motion";

/** The Playful lip height in px; matches `--playful-lip` in playful.css. */
export const PLAYFUL_LIP = 4;

const PRESS_MS = 70;

/** True while a Playful (xolace+) variant is the active theme. */
export function useIsPlayful() {
	const { currentTheme } = useAppTheme();
	return currentTheme.startsWith("playful-");
}

/**
 * Press-down state for a Playful lip: 0 at rest, 1 while held. Spread
 * `onPressIn` / `onPressOut` on the pressable and hand `pressed` to
 * PlayfulLip. Reduce Motion snaps instead of easing.
 */
export function usePlayfulPress() {
	const pressed = useSharedValue(0);
	const reduced = useEffectiveReducedMotion();
	const to = (v: number) =>
		pressed.set(reduced ? v : withTiming(v, { duration: PRESS_MS }));
	return {
		onPressIn: () => to(1),
		onPressOut: () => to(0),
		pressed,
	};
}
