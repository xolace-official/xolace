import { useEffect, useRef } from "react";
import { type SharedValue, useAnimatedReaction } from "react-native-reanimated";
import { NEUTRAL, PRESETS } from "@/components/xolace-face/pose";
import { useFace } from "@/components/xolace-face/use-face";
import { playSoftPress } from "@/lib/haptics";
import { poseForPresence } from "../presence-pose";
import type { Presence } from "../use-talk";

const GLAD_HOLD_MS = 1600;

type Args = {
	running: boolean;
	before: boolean;
	sampling: boolean;
	presence: Presence;
	heard: number;
	level: SharedValue<number>;
	listening: boolean;
};

export function useHeroFace({
	running,
	before,
	sampling,
	presence,
	heard,
	level,
	listening,
}: Args) {
	const face = useFace(NEUTRAL, running);
	const { to, nod, listen } = face;
	let pose = poseForPresence(presence);
	if (before) {
		pose = sampling ? PRESETS.speaking : NEUTRAL;
	}
	const heardBefore = useRef(heard);
	const glad = useRef<ReturnType<typeof setTimeout>>(undefined);
	const smiling = useRef(false);

	useEffect(() => {
		clearTimeout(glad.current);
		smiling.current = false;
		to(pose);
	}, [to, pose]);
	useEffect(() => () => clearTimeout(glad.current), []);

	useEffect(() => {
		if (heard > heardBefore.current) {
			nod();
		}
		heardBefore.current = heard;
	}, [nod, heard]);

	useAnimatedReaction(
		() => (listening ? level.get() : 0),
		(v) => listen.set(v)
	);

	const smile = () => {
		clearTimeout(glad.current);
		if (!smiling.current) {
			to(PRESETS.glad);
		}
		smiling.current = true;
	};
	const relax = () => {
		clearTimeout(glad.current);
		glad.current = setTimeout(() => {
			smiling.current = false;
			to(pose);
		}, GLAD_HOLD_MS);
	};
	const smileBack = () => {
		playSoftPress();
		smile();
		nod();
		relax();
	};

	return { face, relax, smile, smileBack };
}
