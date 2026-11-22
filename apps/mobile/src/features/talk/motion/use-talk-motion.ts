import type { TalkView } from "@xolace/backend/convex/lib/voices";
import { useEffect } from "react";
import {
	cancelAnimation,
	Easing,
	useSharedValue,
	withDelay,
	withRepeat,
	withSequence,
	withTiming,
} from "react-native-reanimated";
import type { Phase } from "../talk-model";
import { GLOW, GO, INTRO, timing } from "./talk-motion";

const INTRO_END = INTRO.gap * (INTRO.groups - 1) + INTRO.length;
const VIEW_FADE_MS = 260;
const BREATH = timing(GLOW.loopMs / 2, Easing.inOut(Easing.sin));

export function useTalkMotion({
	phase,
	view,
	talking,
	reduced,
}: {
	phase: Phase;
	view: TalkView;
	talking: boolean;
	reduced: boolean;
}) {
	const go = useSharedValue(0);
	const intro = useSharedValue(INTRO_END);
	const toPill = useSharedValue(0);
	const handed = useSharedValue(0);
	const stage = useSharedValue(1);
	const conversation = useSharedValue(0);
	const glowOpacity = useSharedValue<number>(GLOW.startRest);
	const glowScale = useSharedValue(1);
	const reducedSV = useSharedValue(reduced);

	useEffect(() => reducedSV.set(reduced), [reduced, reducedSV]);

	const playIntro = () => {
		intro.set(0);
		intro.set(withTiming(INTRO_END, timing(reduced ? GO.reduced : INTRO_END)));
	};

	const playGo = (opens: TalkView) => {
		const length = reduced ? GO.reduced : GO.length;
		toPill.set(opens === "conversation" && !reduced ? 1 : 0);
		handed.set(opens === "companion" ? 1 : 0);
		stage.set(1);
		conversation.set(0);
		go.set(0);
		go.set(withTiming(length, timing(length)));
		if (opens === "conversation") {
			const at = reduced ? 0 : GO.toPill;
			handed.set(withDelay(at, withTiming(1, timing(0))));
			stage.set(withDelay(at, withTiming(0, timing(reduced ? GO.reduced : 0))));
			toPill.set(withDelay(at + 1, withTiming(0, timing(0))));
			conversation.set(
				withDelay(
					at,
					withTiming(1, timing(reduced ? GO.reduced : VIEW_FADE_MS))
				)
			);
		}
	};

	const playBack = () => {
		toPill.set(0);
		handed.set(0);
		stage.set(1);
		conversation.set(0);
		go.set(withTiming(0, timing(reduced ? GO.reduced : GO.length / 2)));
	};

	const settle = (opens: TalkView) => {
		go.set(reduced ? GO.reduced : GO.length);
		toPill.set(0);
		handed.set(1);
		stage.set(opens === "companion" ? 1 : 0);
		conversation.set(opens === "conversation" ? 1 : 0);
	};

	useEffect(() => {
		if (phase !== "talk" && phase !== "ending") {
			return;
		}
		const config = timing(reduced ? GO.reduced : VIEW_FADE_MS);
		stage.set(withTiming(view === "companion" ? 1 : 0, config));
		conversation.set(withTiming(view === "conversation" ? 1 : 0, config));
	}, [phase, view, reduced, stage, conversation]);

	const before = phase === "start";
	useEffect(() => {
		cancelAnimation(glowOpacity);
		cancelAnimation(glowScale);
		if (talking && !reduced) {
			glowOpacity.set(
				withRepeat(
					withSequence(
						withTiming(GLOW.high, BREATH),
						withTiming(GLOW.low, BREATH)
					),
					-1
				)
			);
			glowScale.set(
				withRepeat(
					withSequence(withTiming(GLOW.scale, BREATH), withTiming(1, BREATH)),
					-1
				)
			);
			return;
		}
		const rest = timing(GLOW.restMs);
		glowOpacity.set(withTiming(before ? GLOW.startRest : GLOW.talkRest, rest));
		glowScale.set(withTiming(1, rest));
	}, [talking, reduced, before, glowOpacity, glowScale]);

	return {
		conversation,
		glowOpacity,
		glowScale,
		go,
		handed,
		intro,
		playBack,
		playGo,
		playIntro,
		reduced: reducedSV,
		settle,
		stage,
		toPill,
	};
}

export type TalkMotion = ReturnType<typeof useTalkMotion>;
