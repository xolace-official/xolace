import { useEffect, useRef } from "react";
import { type SharedValue, useAnimatedReaction } from "react-native-reanimated";
import { NEUTRAL, PRESETS } from "@/components/xolace-face/pose";
import { useFace } from "@/components/xolace-face/use-face";
import { playSoftPress } from "@/lib/haptics";
import { poseForPresence } from "../presence-pose";
import type { Presence } from "../use-talk";

/** How long a touch keeps it smiling before it goes back to the talk (production: 1.6 s). */
const GLAD_HOLD_MS = 1600;

type Args = {
	running: boolean;
	before: boolean;
	/** A voice sample is playing: the face takes its speaking pose. */
	sampling: boolean;
	presence: Presence;
	/** Lines the person has finished: it nods at each new one. */
	heard: number;
	/** Your voice, 0–1; the face leans in with it while the stage shows. */
	level: SharedValue<number>;
	listening: boolean;
};

/**
 * The hero: the companion's one live face, from the carousel's centre to the stage. Before
 * the talk it is neutral, or speaking while a sample plays; in the talk it holds production's
 * presence poses, nods when you finish a line, leans in with your voice and smiles back when
 * touched. Nothing here drives the mouth from audio, a level or a timer (§5).
 */
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
	// What it had heard last time: a reopened talk starts with its thread and shouldn't nod.
	const heardBefore = useRef(heard);
	const glad = useRef<ReturnType<typeof setTimeout>>(undefined);
	const smiling = useRef(false);

	// The talk moved on: back to its pose now, even mid-smile.
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

	// It leans in with your voice. Hidden, it stops reading the level.
	useAnimatedReaction(
		() => (listening ? level.get() : 0),
		(v) => listen.set(v)
	);

	// The smile starts as the finger lands and holds while it stays; a second `to` mid-smile
	// would restart its spring, so it poses once.
	const smile = () => {
		clearTimeout(glad.current);
		if (!smiling.current) {
			to(PRESETS.glad);
		}
		smiling.current = true;
	};
	// From the lift, or a touch that slid away: back to the talk after a moment.
	const relax = () => {
		clearTimeout(glad.current);
		glad.current = setTimeout(() => {
			smiling.current = false;
			to(pose);
		}, GLAD_HOLD_MS);
	};
	// VoiceOver's and TalkBack's activate send only this, so it smiles here too.
	const smileBack = () => {
		playSoftPress();
		smile();
		nod();
		relax();
	};

	return { face, relax, smile, smileBack };
}
