import type { TalkView } from "@xolace/backend/convex/lib/voices";
import { useEffect, useEffectEvent, useRef } from "react";
import type { Phase } from "../talk-model";
import type { TalkMotion } from "./use-talk-motion";

export function usePhaseMotion(
	motion: TalkMotion,
	phase: Phase,
	view: TalkView
) {
	const before = phase === "start";
	const was = useRef<boolean | null>(null);
	const play = useEffectEvent((startScreen: boolean) => {
		const first = was.current === null;
		const changed = was.current !== startScreen;
		was.current = startScreen;
		if (first) {
			if (startScreen) {
				motion.playIntro();
			} else {
				motion.settle(view);
			}
		} else if (changed) {
			if (startScreen) {
				motion.playBack();
			} else {
				motion.playGo(view);
			}
		}
	});
	useEffect(() => play(before), [before]);
}
