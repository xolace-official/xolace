import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { Presets } from "react-native-pulsar";
import { type SharedValue, useSharedValue } from "react-native-reanimated";
import { NEUTRAL } from "@/components/xolace-face/pose";
import { playAffirmativePress, playSessionComplete } from "@/lib/haptics";
import { COPY } from "./copy";
import { SESSION_FACE } from "./face/session-face";
import type { SessionFace } from "./face/use-session-face";
import type { MoodSlider, SliderHandlers } from "./moment-one/use-mood-slider";
import { SAME } from "./mood-scale";
import type { SessionEnd } from "./session-end-data";
import { continueStep, momentGate, savedMood } from "./session-end-model";
import { T1 } from "./session-look";
import type { SessionClocks } from "./use-session-clocks";

/** A follow-up row closes the sheet; moment 2 follows (board `answer`). */
const AFTER_SHEET_MS = 380;
/** "I'm done for now" waits for the face's hop. */
const LEAVE_MS = 350;

export type Answer = {
	moment: 1 | 2;
	/** null until answered. */
	step: number | null;
	unsure: boolean;
};

type Args = {
	face: SessionFace;
	clocks: SessionClocks;
	slider: MoodSlider;
	touched: SharedValue<number>;
	driving: SharedValue<number>;
	late: boolean;
	session: SessionEnd;
};

/**
 * The moments' flow: the arrival (the face comes down in its crescent eyes,
 * the day ticks over), Continue (the follow-up sheet from step −3 down, else
 * moment 2), Not sure, the move to moment 2, and leaving. The answer is screen
 * state; what it saves goes through the provider.
 */
export function useMomentFlow({
	face,
	clocks,
	slider,
	touched,
	driving,
	late,
	session,
}: Args) {
	const [answer, setAnswer] = useState<Answer>({
		moment: 1,
		step: null,
		unsure: false,
	});
	/** Where the thumb was let go: what Continue saves beside the word. */
	const position = useSharedValue(SAME);
	const asked = useRef(false);
	const current = useRef(answer);
	useEffect(() => {
		current.current = answer;
	});
	const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
	const at = (ms: number, fn: () => void) =>
		timers.current.push(setTimeout(fn, ms));
	useEffect(
		() => () => {
			for (const t of timers.current) {
				clearTimeout(t);
			}
		},
		[]
	);

	/** `turn: false` keeps the arrival's crescent eyes (a dev state's frozen frame). */
	const arrive = (turn = true) => {
		touched.set(0);
		driving.set(0);
		slider.reset(false);
		clocks.stop("c2");
		clocks.run("c1");
		face.to(late ? SESSION_FACE.rest : SESSION_FACE.heard);
		at(T1.roll.at, playSessionComplete);
		at(T1.turn, () => {
			const a = current.current;
			if (!turn) {
				return;
			}
			if (
				!(
					late ||
					a.moment !== 1 ||
					a.step !== null ||
					a.unsure ||
					driving.get()
				)
			) {
				face.to(NEUTRAL);
			}
		});
	};

	/** Synchronous, unlike the moment in state, which lands a render later. */
	const [gate] = useState(momentGate);

	const toMoment2 = (from = 0) => {
		if (!gate.enter()) {
			return;
		}
		setAnswer((a) => ({ ...a, moment: 2 }));
		face.to(SESSION_FACE.watch);
		clocks.run("c2", from);
	};

	const cont = () => {
		const a = current.current;
		const next = continueStep({
			asked: asked.current,
			canAsk: session.state.canAskFollowUp,
			late,
			moment: a.moment,
			pending: gate.busy,
			step: a.step,
		});
		if (next === "ignore") {
			return;
		}
		Presets.System.selection();
		const pos = position.get();
		if (next === "ask" && a.step !== null) {
			asked.current = true;
			gate.hold();
			session.actions.saveMood({
				moodPosition: pos,
				postSessionMood: "heavier",
			});
			face.to(SESSION_FACE.concern);
			session.actions.askFollowUp(a.step, () =>
				at(AFTER_SHEET_MS, () => toMoment2())
			);
			return;
		}
		const mood = late
			? null
			: savedMood({ position: pos, step: a.step, unsure: a.unsure });
		if (mood) {
			session.actions.saveMood(mood);
		}
		toMoment2();
	};

	const pickUnsure = () => {
		if (current.current.moment !== 1) {
			return;
		}
		Presets.murmur();
		driving.set(0);
		slider.reset(true);
		position.set(SAME);
		setAnswer({ moment: 1, step: null, unsure: true });
		face.to(SESSION_FACE.thinking);
		AccessibilityInfo.announceForAccessibility(COPY.notSureLine);
	};

	const slide: SliderHandlers = {
		onEdge: () => Presets.System.selection(),
		onRelease: (v: number) => position.set(v),
		onStep: (step: number) => {
			if (step === 0) {
				Presets.feather();
			} else {
				Presets.System.selection();
			}
			setAnswer({ moment: 1, step, unsure: false });
		},
		onTouch: () => {
			if (current.current.unsure) {
				setAnswer((a) => ({ ...a, unsure: false }));
			}
		},
	};

	useEffect(() => slider.listen(slide));

	const done = () => {
		playAffirmativePress();
		face.to(SESSION_FACE.glad);
		face.hop();
		at(LEAVE_MS, session.actions.done);
	};

	const another = () => {
		Presets.System.selection();
		session.actions.another();
	};

	return {
		another,
		answer,
		arrive,
		cont,
		done,
		pickUnsure,
		position,
		setAnswer,
		toMoment2,
	};
}

export type MomentFlow = ReturnType<typeof useMomentFlow>;
