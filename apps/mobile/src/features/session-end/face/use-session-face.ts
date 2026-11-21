import { useEffect, useRef } from "react";
import {
	type SharedValue,
	useAnimatedReaction,
	useDerivedValue,
	useSharedValue,
	withSpring,
} from "react-native-reanimated";
import type { Pose } from "@/components/xolace-face/pose";
import { MOVE_SPRING, useFace } from "@/components/xolace-face/use-face";
import { BREATH, PLAY_AS_CHOSEN } from "@/design/springs";
import { SAME } from "../mood-scale";
import { checkInPose, SESSION_FACE } from "./session-face";

const TAU = Math.PI * 2;
const MS_PER_S = 1000;

type Args = {
	running: boolean;
	late: boolean;
	reduced: boolean;
	pos: SharedValue<number>;
	driving: SharedValue<number>;
};

export function useSessionFace({ running, late, reduced, pos, driving }: Args) {
	const face = useFace(late ? SESSION_FACE.rest : SESSION_FACE.heard, running);
	const period = (late ? BREATH.nightMs : BREATH.dayMs) / MS_PER_S;
	const breath = useDerivedValue(() =>
		reduced ? 0 : 0.5 - 0.5 * Math.cos((TAU * face.clock.get()) / period)
	);
	const follow = useSharedValue(SAME);
	const { hold } = face;

	useAnimatedReaction(
		() => pos.get(),
		(v, prev) => {
			if (prev === null || v === prev || !driving.get()) {
				return;
			}
			follow.set(
				reduced ? v : withSpring(v, { ...MOVE_SPRING, ...PLAY_AS_CHOSEN })
			);
		}
	);
	useAnimatedReaction(
		() => follow.get(),
		(v, prev) => {
			if (prev === null || v === prev || !driving.get()) {
				return;
			}
			hold(checkInPose(v));
		}
	);

	const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
	useEffect(() => () => timers.current.forEach(clearTimeout), []);

	const to = (p: Pose) => {
		driving.set(0);
		face.to(p);
	};
	return {
		breath,
		briefly: (p: Pose, ms: number, after: Pose) => {
			to(p);
			timers.current.push(setTimeout(() => face.to(after), ms));
		},
		clear: () => {
			timers.current.forEach(clearTimeout);
			timers.current = [];
		},
		face,
		hop: () => face.hop(),
		to,
	};
}

export type SessionFace = ReturnType<typeof useSessionFace>;
