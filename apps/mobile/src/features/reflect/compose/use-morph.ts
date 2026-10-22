import { type RefObject, useEffect, useRef } from "react";
import type { TextInputInstance } from "react-native";
import { Keyboard } from "react-native";
import {
	ReduceMotion,
	useSharedValue,
	withSequence,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { MORPH_SPRING } from "@/src/features/reflect/compose/morph-geometry";

type Args = {
	/** True from the moment the reducer leaves `idle`. */
	expanded: boolean;
	reduceMotion: boolean;
	/** False for the outgoing copy during a cross-fade to another state. */
	focusOnExpand: boolean;
	inputRef: RefObject<TextInputInstance | null>;
	/** Runs when the card closes — the pending pause nudge goes with it. */
	onCollapse: () => void;
};

/**
 * The one value the compose screen is made of: 0 at rest, 1 composing.
 *
 * Full motion runs a single spring, so every dimension of the card arrives
 * together. Reduced motion cross-fades the two geometries instead — no travel,
 * no rotation, but the same one-object-at-two-sizes story. `ReduceMotion.Never`
 * on both timings is required, not optional: with the system flag on,
 * Reanimated otherwise resolves the cross-fade to its end value in a single
 * frame, which is the hard cut the fallback exists to avoid.
 */
export function useMorph({
	expanded,
	reduceMotion,
	focusOnExpand,
	inputRef,
	onCollapse,
}: Args) {
	const progress = useSharedValue(expanded ? 1 : 0);
	const fade = useSharedValue(1);
	const settled = useRef(false);
	const wasExpanded = useRef(expanded);

	useEffect(() => {
		const to = expanded ? 1 : 0;
		const first = !settled.current;
		const morphed = expanded !== wasExpanded.current;
		wasExpanded.current = expanded;
		settled.current = true;

		if (first) {
			// Whatever the screen resumed into is where the card already is.
			progress.set(to);
		} else if (!morphed) {
			// `reduceMotion` resolves asynchronously (Convex preferences + the OS
			// a11y flag), so it flips under a settled card. That is not a morph —
			// replaying one here cross-fades the whole screen out and back for no
			// reason, and only ever for reduced-motion users.
			progress.set(to);
			return;
		} else if (reduceMotion) {
			fade.set(
				withSequence(
					withTiming(
						0,
						{ duration: 90, reduceMotion: ReduceMotion.Never },
						(done) => {
							"worklet";
							if (done) {
								progress.set(to);
							}
						}
					),
					withTiming(1, { duration: 140, reduceMotion: ReduceMotion.Never })
				)
			);
		} else {
			progress.set(withSpring(to, MORPH_SPRING));
		}

		if (expanded) {
			if (focusOnExpand) {
				inputRef.current?.focus();
			}
		} else if (!first) {
			onCollapse();
			Keyboard.dismiss();
		}
	}, [
		expanded,
		fade,
		focusOnExpand,
		inputRef,
		onCollapse,
		progress,
		reduceMotion,
	]);

	return { fade, progress };
}
