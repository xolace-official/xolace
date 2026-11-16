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
	/** The slider's position. */
	pos: SharedValue<number>;
	/** 1 while the slider drives the face (from the first touch until Not sure or moment 2). */
	driving: SharedValue<number>;
};

/**
 * The one face (handoff §4). It arrives in the crescent eyes the session ended
 * on (late: resting), and while the slider drives it, it follows as
 * production's check-in did: `follow` is retargeted with `MOVE_SPRING` on each
 * change of the position, and the face holds `checkInPose(follow)`, all on the
 * UI thread. Reduce Motion follows directly. Its clock is the breath for the
 * header and your star (4.8 s, late 6.7 s).
 */
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
		/** A pose now, another after `ms`. */
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
		/** A pose, sprung from wherever the face is; the slider lets go of it. */
		to,
	};
}

export type SessionFace = ReturnType<typeof useSessionFace>;
