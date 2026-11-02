// The companion's face in the talk's title pill (#590). It blinks and breathes, holds itself
// for what the talk is doing, and nods when you finish a line.

import { useEffect } from "react";
import type { Talk } from "@/features/talk/use-talk";
import { NEUTRAL } from "@/features/xolace-face/pose";
import { useFace } from "@/features/xolace-face/use-face";
import { XolaceFace } from "@/features/xolace-face/xolace-face";
import { poseForPresence } from "./presence-pose";

const SIZE = 32;

export function HeaderFace({ talk }: { talk: Talk }) {
	const face = useFace(NEUTRAL);
	const target = talk.started ? poseForPresence(talk.presence) : NEUTRAL;
	const heard = talk.turns.filter((t) => t.speaker === "person").length;

	useEffect(() => face.to(target), [face.to, target]);
	useEffect(() => {
		if (heard > 0) {
			face.nod();
		}
	}, [face.nod, heard]);

	return <XolaceFace face={face} size={SIZE} />;
}
