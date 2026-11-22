import { useIsFocused } from "expo-router";
import { useEffect, useReducer } from "react";
import { AccessibilityInfo } from "react-native";
import { useAppActive } from "@/components/shared/use-app-active";
import {
	type BreathStep,
	playCompassionateHold,
	playGentlePresence,
	playSoftenPulse,
	useBreathHaptics,
} from "@/lib/haptics";
import type { PhaseKind } from "../clock/breath";
import { type ClockEvents, clockCfg } from "../clock/clock-config";
import { phaseSaid } from "../clock/phases";
import { useSitClock } from "../clock/use-sit-clock";
import { COPY } from "../copy";
import { type Exercise, type HandIntensity, isBreathing } from "../sit-model";
import { breathFelt, type RunStart, runReducer, startRun } from "./sit-run";

const HAND: Record<HandIntensity, () => void> = {
	heavy: playCompassionateHold,
	light: playGentlePresence,
	medium: playSoftenPulse,
};
const STEP: Record<PhaseKind, BreathStep> = { 0: "in", 1: "top", 2: "out" };

/**
 * Queued, so a beat's line and its first phase are both heard (an unqueued
 * announcement cuts off the one before it). The queue option is iOS's; Android
 * reads each in turn anyway.
 */
const announce = (text: string) =>
	AccessibilityInfo.announceForAccessibilityWithOptions(text, { queue: true });

type Args = {
	exercise: Exercise;
	preRoll: boolean;
	W: number;
	H: number;
	reduced: boolean;
	at?: RunStart["at"];
	hold?: boolean;
};

export function useSitRun({
	exercise,
	preRoll,
	W,
	H,
	reduced,
	at,
	hold = false,
}: Args) {
	const total = exercise.beats.length;
	const [run, dispatch] = useReducer(
		runReducer,
		{ at, preRoll, total },
		startRun
	);
	const beat = exercise.beats[run.beat] ?? exercise.beats[0];
	const focused = useIsFocused();
	const active = useAppActive();
	const inFront = focused && active;
	const frozen = run.paused || hold;
	const feel = breathFelt({ frozen, inFront, reduced });
	const breath = useBreathHaptics();

	const events: ClockEvents = {
		beatEnd: (serial) => dispatch({ serial, total, type: "advance" }),
		doneReady: (serial) => dispatch({ serial, type: "doneReady" }),
		linkReady: () => dispatch({ type: "linkReady" }),
		phase: (serial, kind, ms, caption, first) => {
			if (serial !== run.serial || !beat) {
				return;
			}
			if (feel) {
				breath.play(STEP[kind], ms);
			}
			announce(phaseSaid(beat, kind, caption, first));
		},
		pulse: (serial) => {
			if (serial === run.serial && feel && beat?.k === "haptic") {
				HAND[beat.intensity]();
			}
		},
	};
	const clock = useSitClock({
		events,
		frozen,
		H,
		reduced,
		running: inFront,
		settle: hold,
		W,
	});

	const { cfg } = clock;
	useEffect(() => {
		if (beat) {
			cfg.set(clockCfg(run, beat));
		}
	}, [cfg, run, beat]);

	const { stop } = breath;
	useEffect(() => {
		if (!feel) {
			stop();
		}
	}, [feel, stop]);
	useEffect(() => stop, [stop]);

	const said =
		run.stage === "close" ? `${COPY.stayed.title} ${COPY.stayed.sub}` : null;
	const spoken =
		beat && typeof beat.t === "string" && !isBreathing(beat.k) ? beat.t : null;
	const line = run.stage === "play" ? spoken : null;
	useEffect(() => {
		const text = said ?? line;
		if (text) {
			announce(text);
		}
	}, [said, line]);

	return {
		beat,
		begin: () => dispatch({ total, type: "begin" }),
		clock,
		inFront,
		next: () => dispatch({ serial: run.serial, total, type: "advance" }),
		run,
		setPaused: (paused: boolean) => dispatch({ paused, type: "pause" }),
	};
}
