import { useEffect, useState } from "react";
import { Gesture } from "react-native-gesture-handler";
import {
	Easing,
	type EasingFunction,
	type EasingFunctionFactory,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { playTextureSelect } from "@/lib/haptics";
import { LETTER_MOTION } from "../letter-motion";

const M = LETTER_MOTION;
const O = M.open;
const FOLD = Easing.bezier(...M.curves.fold);
const ROLL = Easing.bezier(...M.curves.roll);
const DRIFT = Easing.bezier(...M.curves.drift);
const NEVER = PLAY_AS_CHOSEN.reduceMotion;
/** The pan starts on 8 pt up, and gives way to a sideways swipe past 24 pt. */
const PAN = { fail: 24, start: -8 };
/** A third this far over lies flat on the middle one. */
const FOLDED = 0.97;
const t = (
	to: number,
	duration: number,
	easing: EasingFunction | EasingFunctionFactory = FOLD
) => withTiming(to, { duration, easing, ...PLAY_AS_CHOSEN });

/**
 * The reader's letter on Reanimated (handoff §5 Open, Hide): sealed, dragging up opens it
 * (progress = up-distance / 320 pt; the seal splits at 7 %, the flap follows the finger over the
 * first third; past 42 % or a 900 pt/s flick it commits, otherwise it springs shut, 260/18).
 * Opening: the flap finishes (300 ms), the bottom third 300 ms after, then the creases fade once.
 * Hide drifts it aside (110 % of its width, 4°) and fades, 420 ms. Reduced: no drag, no drift.
 */
export function useLetterOpen({
	sealed,
	hiding,
	reduced,
	width,
	onCommit,
}: {
	sealed: boolean;
	hiding: boolean;
	reduced: boolean;
	width: number;
	onCommit: () => void;
}) {
	const top = useSharedValue(sealed ? 1 : 0);
	const bottom = useSharedValue(sealed ? 1 : 0);
	const crease = useSharedValue(sealed ? 1 : O.crease.rest);
	const progress = useSharedValue(0);
	const split = useSharedValue(0);
	const drift = useSharedValue(hiding ? 1 : 0);
	const [dragSplit, setDragSplit] = useState(false);

	useEffect(() => {
		if (sealed) {
			// Sealed, or sealed again after a failed open: whole, with its seal unbroken.
			top.set(1);
			bottom.set(1);
			crease.set(1);
			progress.set(0);
			split.set(0);
			setDragSplit(false);
			return;
		}
		if (reduced) {
			top.set(0);
			bottom.set(0);
			crease.set(O.crease.rest);
			return;
		}
		top.set(t(0, O.flapMs));
		bottom.set(withDelay(O.flapMs, t(0, O.bottomMs), NEVER));
		crease.set(
			withDelay(
				O.flapMs + O.bottomMs,
				t(O.crease.rest, O.crease.ms, ROLL),
				NEVER
			)
		);
	}, [sealed, reduced, top, bottom, crease, progress, split]);

	useEffect(() => {
		drift.set(t(hiding ? 1 : 0, reduced ? M.reducedMs : M.hide.ms, DRIFT));
	}, [hiding, reduced, drift]);

	const pan = Gesture.Pan()
		.enabled(sealed && !reduced)
		.activeOffsetY(PAN.start)
		.failOffsetX([-PAN.fail, PAN.fail])
		.onUpdate((e) => {
			const pr = Math.min(1, Math.max(0, -e.translationY / O.dragPt));
			progress.set(pr);
			top.set(1 - Math.min(1, pr / O.flapUntil));
			if (pr > O.splitAt && split.get() === 0) {
				split.set(1);
				scheduleOnRN(setDragSplit, true);
				scheduleOnRN(playTextureSelect);
			}
		})
		.onEnd((e) => {
			if (progress.get() >= O.commitAt || e.velocityY < O.flickVy) {
				scheduleOnRN(onCommit);
				return;
			}
			top.set(withSpring(1, { ...O.shut, ...PLAY_AS_CHOSEN }));
			progress.set(0);
			if (split.get() === 1) {
				split.set(0);
				scheduleOnRN(setDragSplit, false);
			}
		});

	const driftX = width * M.hide.x;
	const driftStyle = useAnimatedStyle(() => {
		const d = drift.get();
		const move = reduced ? 0 : d;
		return {
			opacity: 1 - d,
			transform: [
				{ translateX: driftX * move },
				{ rotate: `${M.hide.rotate * move}deg` },
			],
		};
	});
	// iOS draws no layer at exactly 180°: the paper's back covers the middle while a third is over.
	const coverStyle = useAnimatedStyle(() => ({
		opacity: top.get() > FOLDED || bottom.get() > FOLDED ? 1 : 0,
	}));

	return { bottom, coverStyle, crease, dragSplit, driftStyle, pan, top };
}
