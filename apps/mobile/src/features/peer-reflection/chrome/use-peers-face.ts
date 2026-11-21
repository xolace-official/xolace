import { useEffect, useRef } from "react";
import { useDerivedValue } from "react-native-reanimated";
import { NEUTRAL, type Pose, PRESETS } from "@/components/xolace-face/pose";
import { useFace } from "@/components/xolace-face/use-face";
import { useBreathPeriod } from "@/design/motion";
import { useLater } from "@/lib/use-later";
import { MOTION } from "../peers-look";

const pose = (p: Partial<Pose>): Pose => ({ ...NEUTRAL, ...p });

const PEERS_FACE = {
	heard: pose({ cheeks: 0.7, eyeShape: 1, mouth: 0.8, squash: 0.15 }),
	reading: pose({
		browLift: 0.15,
		eyeOpen: 0.9,
		gazeY: 0.45,
		mouth: 0.25,
		restless: 0.04,
	}),
} as const;
const GLANCE = { holdMs: 370, y: 0.6 } as const;
const TAU = Math.PI * 2;
const MS_PER_S = 1000;

type Args = {
	running: boolean;
	loading: boolean;
	waiting: boolean;
	reduced: boolean;
};

export function usePeersFace({ running, loading, waiting, reduced }: Args) {
	const face = useFace(loading ? PRESETS.waiting : PRESETS.attentive, running);
	const later = useLater();
	const period = useBreathPeriod() / MS_PER_S;
	const breath = useDerivedValue(() =>
		reduced ? 1 : 0.5 - 0.5 * Math.cos((TAU * face.clock.get()) / period)
	);
	const { to, look, hop } = face;
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
