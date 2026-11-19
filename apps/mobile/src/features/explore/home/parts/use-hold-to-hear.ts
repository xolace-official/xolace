import { useEffect, useRef } from "react";
import type { AccessibilityActionEvent, PressableProps } from "react-native";
import { type SharedValue, useSharedValue } from "react-native-reanimated";
import { press } from "@/design/springs";
import { HOME } from "@/features/explore/copy";
import { HOME_TIMING } from "@/features/explore/explore-style";
import { useHome } from "@/features/explore/home/home-data";
import { tap } from "@/lib/haptics";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

export type Hold = {
	hearing: boolean;
	/** 1 while the finger is down: the cover settles to .97. */
	pressed: SharedValue<number>;
	press: Pick<
		PressableProps,
		"onPress" | "onPressIn" | "onPressOut" | "onLongPress" | "delayLongPress"
	>;
	a11y: Pick<PressableProps, "accessibilityActions" | "onAccessibilityAction">;
};

/**
 * Hold to hear (handoff §13): 350 ms held starts a preview, letting go ends it, 8 s at most. A
 * press under 350 ms is a tap and opens. A drag hands the touch to the scroll view, which ends the
 * press like a release. `enabled` is false for Lantern covers, rows that only open, and while the
 * app has no preview to play (`canPreview`).
 */
export function useHoldToHear(
	key: string,
	enabled: boolean,
	open: () => void
): Hold {
	const { state, actions } = useHome();
	const reduced = useEffectiveReducedMotion();
	const pressed = useSharedValue(0);
	const cap = useRef<ReturnType<typeof setTimeout> | null>(null);
	const on = enabled && state.canPreview;

	const end = () => {
		if (cap.current) {
			clearTimeout(cap.current);
			cap.current = null;
		}
		actions.hearEnd(key);
	};
	const start = () => {
		tap();
		actions.hearStart(key);
		if (cap.current) {
			clearTimeout(cap.current);
		}
		cap.current = setTimeout(end, HOME_TIMING.previewCapMs);
	};
	useEffect(
		() => () => {
			if (cap.current) {
				clearTimeout(cap.current);
			}
		},
		[]
	);

	const base = {
		onPress: open,
		onPressIn: () => pressed.set(press(1, reduced)),
		onPressOut: () => {
			pressed.set(press(0, reduced));
			if (on) {
				end();
			}
		},
	};
	if (!on) {
		return { a11y: {}, hearing: false, press: base, pressed };
	}
	return {
		a11y: {
			accessibilityActions: [{ label: HOME.hearAction, name: "preview" }],
			onAccessibilityAction: (e: AccessibilityActionEvent) => {
				if (e.nativeEvent.actionName === "preview") {
					start();
				}
			},
		},
		hearing: state.hearing === key,
		press: {
			...base,
			delayLongPress: HOME_TIMING.holdMs,
			onLongPress: start,
		},
		pressed,
	};
}
