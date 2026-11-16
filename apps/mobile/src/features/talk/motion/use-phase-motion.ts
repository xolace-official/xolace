import type { TalkView } from "@xolace/backend/convex/lib/voices";
import { useEffect, useRef } from "react";
import type { Phase } from "../talk-model";
import type { TalkMotion } from "./use-talk-motion";

/**
 * Plays the screen's moves as the talk's phase changes (§6): the entrance on a fresh start
 * screen, straight into place for a talk already under way (a reopened talk, a dev state),
 * the move into the talk when Start is pressed, and back to the start screen when a talk
 * fails before it connects.
 */
export function usePhaseMotion(
	motion: TalkMotion,
	phase: Phase,
	view: TalkView
) {
	const before = phase === "start";
	const was = useRef<boolean | null>(null);
	useEffect(() => {
		const first = was.current === null;
		const changed = was.current !== before;
		was.current = before;
		if (first) {
			if (before) {
				motion.playIntro();
			} else {
				motion.settle(view);
			}
		} else if (changed) {
			if (before) {
				motion.playBack();
			} else {
				motion.playGo(view);
			}
		}
	}, [before]);
}
