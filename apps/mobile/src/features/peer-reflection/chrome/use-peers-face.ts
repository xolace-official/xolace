import { useEffect, useRef } from "react";
import { useDerivedValue } from "react-native-reanimated";
import { NEUTRAL, type Pose, PRESETS } from "@/components/xolace-face/pose";
import { useFace } from "@/components/xolace-face/use-face";
import { useBreathPeriod } from "@/design/motion";
import { useLater } from "@/lib/use-later";
import { MOTION } from "../peers-look";

const pose = (p: Partial<Pose>): Pose => ({ ...NEUTRAL, ...p });

const PEERS_FACE = {
	/** Turned on: the eyes close into the crescent (Reflect's `heard`), then a hop. */
	heard: pose({ cheeks: 0.7, eyeShape: 1, mouth: 0.8, squash: 0.15 }),
	/** Board `POSES.watch`: reading along, eyes lowered to the cards. */
	reading: pose({
		browLift: 0.15,
		eyeOpen: 0.9,
		gazeY: 0.45,
		mouth: 0.25,
		restless: 0.04,
	}),
} as const;
/** watchful-eyes' glance: toward the card that landed, then back. */
const GLANCE = { holdMs: 370, y: 0.6 } as const;
const TAU = Math.PI * 2;
const MS_PER_S = 1000;

type Args = {
	running: boolean;
	loading: boolean;
	/** A sheet or the hold menu is up: the face waits. */
	waiting: boolean;
	reduced: boolean;
};

/**
 * The face (handoff §8): attentive while the words arrive, glancing at each
 * card as it lands; reading once they're all in; heard and a hop on a turn-on,
 * back after 1.3 s; waiting while the report sheet is open or the results load;
 * a slow nod for None yet. Its clock is the screen's one breath: your star and a
 * lit card's edge breathe on it too (4.8 s, late 6.7 s).
 */
export function usePeersFace({ running, loading, waiting, reduced }: Args) {
	const face = useFace(loading ? PRESETS.waiting : PRESETS.attentive, running);
	const later = useLater();
	const period = useBreathPeriod() / MS_PER_S;
	const breath = useDerivedValue(() =>
		reduced ? 1 : 0.5 - 0.5 * Math.cos((TAU * face.clock.get()) / period)
	);
	const { to, look, hop } = face;
	// The pose the face rests in between moments.
	const rest = useRef<Pose>(PRESETS.attentive);

	const settle = (p: Pose) => {
		rest.current = p;
		to(p);
	};
	useEffect(() => {
		to(waiting || loading ? PRESETS.waiting : rest.current);
	}, [waiting, loading, to]);

	return {
		alone: () => settle(PRESETS.nod),
		breath,
		face,
		glance: () => {
			look(0, GLANCE.y);
			later(() => look(0, 0), GLANCE.holdMs);
		},
		heard: () => {
			to(PEERS_FACE.heard);
			hop();
			later(() => to(rest.current), MOTION.heardMs);
		},
		read: () => settle(PEERS_FACE.reading),
	};
}
