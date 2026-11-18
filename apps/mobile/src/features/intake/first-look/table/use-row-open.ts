// A Plus row's opening: one progress times the preview's measured height (the board's until it
// lays out), so a larger text size opens to fit instead of clipping. An opened row moves
// VoiceOver focus into its preview.
import { type ComponentRef, useEffect, useRef } from "react";
import { AccessibilityInfo, findNodeHandle, type View } from "react-native";
import {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { PLAY_AS_CHOSEN, REDUCED_FADE_MS } from "@/design/springs";
import {
	CHECK_EASE,
	MOVE_EASE,
	OPEN_FADE_MS,
	OPEN_MS,
	unit,
} from "../first-look-motion";

type Options = {
	free: boolean;
	height: number;
	open: boolean;
	reduced: boolean;
};

export function useRowOpen({ free, height, open, reduced }: Options) {
	const bodyRef = useRef<ComponentRef<typeof View>>(null);
	const p = useSharedValue(open ? 1 : 0);
	const o = useSharedValue(open ? 1 : 0);
	const natural = useSharedValue<number>(height);

	useEffect(() => {
		if (free) {
			return;
		}
		const to = open ? 1 : 0;
		if (reduced) {
			p.set(to);
			o.set(withTiming(to, { duration: REDUCED_FADE_MS, ...PLAY_AS_CHOSEN }));
			return;
		}
		p.set(
			withTiming(to, {
				duration: OPEN_MS,
				easing: MOVE_EASE,
				...PLAY_AS_CHOSEN,
			})
		);
		o.set(withTiming(to, { duration: OPEN_FADE_MS, ...PLAY_AS_CHOSEN }));
	}, [free, o, open, p, reduced]);

	useEffect(() => {
		if (!open) {
			return;
		}
		let alive = true;
		void AccessibilityInfo.isScreenReaderEnabled().then((on) => {
			const node = bodyRef.current ? findNodeHandle(bodyRef.current) : null;
			if (alive && on && node) {
				AccessibilityInfo.setAccessibilityFocus(node);
			}
		});
		return () => {
			alive = false;
		};
	}, [open]);

	const body = useAnimatedStyle(() => ({
		height: p.get() * natural.get(),
		opacity: o.get(),
	}));
	const chevron = useAnimatedStyle(() => {
		const e = CHECK_EASE(unit(p.get()));
		return {
			transform: [{ translateY: -2 + 3 * e }, { rotate: `${45 + 180 * e}deg` }],
		};
	});

	return {
		body,
		bodyRef,
		chevron,
		/** The preview laid out at this height. */
		measured: (h: number) => natural.set(h),
	};
}
