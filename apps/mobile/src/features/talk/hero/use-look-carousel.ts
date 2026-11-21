import { useEffect, useRef } from "react";
import { usePanGesture } from "react-native-gesture-handler";
import { Presets } from "react-native-pulsar";
import {
	cancelAnimation,
	useAnimatedReaction,
	useSharedValue,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { LOOK_ORDER } from "../companion-look";
import { LAYOUT, SNAP, timing } from "../motion/talk-motion";

const LAST = LOOK_ORDER.length - 1;
const MIN_X = -LAST * LAYOUT.slot;
const SPRING = {
	damping: SNAP.damping,
	mass: SNAP.mass,
	stiffness: SNAP.stiffness,
	...PLAY_AS_CHOSEN,
};
const ACTIVE_X = 10;
const FAIL_Y = 14;

export function useLookCarousel({
	index,
	enabled,
	reduced,
	onLand,
}: {
	index: number;
	enabled: boolean;
	reduced: boolean;
	onLand: (i: number) => void;
}) {
	const x = useSharedValue(-index * LAYOUT.slot);
	const startX = useSharedValue(0);
	const landed = useRef(index);

	const land = (i: number) => {
		if (i === landed.current) {
			return;
		}
		landed.current = i;
		onLand(i);
	};

	const snapTo = (i: number, velocity = 0) => {
		"worklet";
		const to = Math.min(LAST, Math.max(0, i));
		const done = (finished?: boolean) => {
			if (finished) {
				scheduleOnRN(land, to);
			}
		};
		x.set(
			reduced
				? withTiming(-to * LAYOUT.slot, timing(0), done)
				: withSpring(-to * LAYOUT.slot, { ...SPRING, velocity }, done)
		);
	};

	useEffect(() => {
		if (index === landed.current) {
			return;
		}
		landed.current = index;
		cancelAnimation(x);
		x.set(-index * LAYOUT.slot);
	}, [index, x]);

	useAnimatedReaction(
		() => Math.min(LAST, Math.max(0, Math.round(-x.get() / LAYOUT.slot))),
		(now, before) => {
			if (before !== null && now !== before) {
				Presets.System.selection();
			}
		}
	);

	const pan = usePanGesture({
		activeOffsetX: [-ACTIVE_X, ACTIVE_X],
		enabled,
		failOffsetY: [-FAIL_Y, FAIL_Y],
		onActivate: () => {
			cancelAnimation(x);
			startX.set(x.get());
		},
		onDeactivate: (e) => {
			const from = Math.round(-startX.get() / LAYOUT.slot);
			const dx = e.translationX;
			const flick =
				Math.abs(e.velocityX) > SNAP.flickVelocity &&
				Math.abs(dx) < SNAP.flickDistance
					? -Math.sign(e.velocityX)
					: 0;
			snapTo(Math.round(from - dx / LAYOUT.slot) + flick, e.velocityX);
		},
		onUpdate: (e) => {
			const raw = startX.get() + e.translationX;
			if (raw > 0) {
				x.set(raw * SNAP.rubber);
			} else if (raw < MIN_X) {
				x.set(MIN_X + (raw - MIN_X) * SNAP.rubber);
			} else {
				x.set(raw);
			}
		},
	});

	const goTo = (i: number) => snapTo(i);

	return { goTo, pan, x };
}

export type LookCarousel = ReturnType<typeof useLookCarousel>;
