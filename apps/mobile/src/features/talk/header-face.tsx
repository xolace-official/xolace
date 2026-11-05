// The companion's face in the talk's title pill (#590), in the look they chose. It blinks and
// breathes, holds itself for what the talk is doing, and nods when you finish a line.

import { useEffect, useRef } from "react";
import { LOOKS } from "@/features/talk/companion/companion-look";
import type { Talk } from "@/features/talk/use-talk";
import { useTalkStyle } from "@/features/talk/use-talk-style";
import { NEUTRAL } from "@/features/xolace-face/pose";
import { useFace } from "@/features/xolace-face/use-face";
import { XolaceFace } from "@/features/xolace-face/xolace-face";
import { poseForPresence } from "./presence-pose";

const SIZE = 34;

type Props = {
	talk: Talk;
	/** `false` while the talk is out of sight: its clock and blinks stop. */
	running: boolean;
};

export function HeaderFace({ talk, running }: Props) {
	const face = useFace(NEUTRAL, running);
	const { look } = useTalkStyle();
	const target = talk.started ? poseForPresence(talk.presence) : NEUTRAL;
	const heard = talk.turns.filter((t) => t.speaker === "person").length;
	// What it had heard last time: a reopened talk starts with its thread and shouldn't nod.
	const heardBefore = useRef(heard);

	useEffect(() => face.to(target), [face.to, target]);
	useEffect(() => {
		if (heard > heardBefore.current) {
			face.nod();
		}
		heardBefore.current = heard;
	}, [face.nod, heard]);

	return <XolaceFace {...LOOKS[look].look} face={face} size={SIZE} />;
}
