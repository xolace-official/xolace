import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useSharedValue } from "react-native-reanimated";
import {
	ANSWER_MS,
	ANSWER_REDUCED_MS,
	ANSWERS,
	CEILING_MS,
	type FixtureAnswer,
	type Loudness,
	VOICE,
} from "@/features/vent/dev/fixtures";
import { usePretendVoice } from "@/features/vent/dev/use-pretend-voice";
import type { VentBackend, VentStage } from "@/features/vent/vent-backend";

export type VentFixture = {
	introSeen: boolean;
	answer: FixtureAnswer;
	voice: Loudness;
	/** The mic is turned off: a tap says so. */
	micOff?: boolean;
	/** v2: today's replies are used, known before. */
	capBefore?: boolean;
	/** ms already spoken when it starts listening (Near the limit). */
	recordedFrom?: number;
	/** Where production's state machine starts (a jump past the burn). */
	stage?: VentStage;
};

const ignore = () => undefined;

/**
 * The backend on fixtures: no mic, no server, no voice credits. Listening writes a pretend voice
 * into the level; letting go "answers" a few seconds later, and production's rule still holds:
 * the reply waits for both the burn and the answer. Leaving goes back to the dev index.
 */
export function useFixtureBackend(
	fx: VentFixture,
	reduced: boolean
): VentBackend {
	const router = useRouter();
	const level = useSharedValue(0);
	const [stage, setStageState] = useState<VentStage>(fx.stage ?? "idle");
	const stageRef = useRef(stage);
	const setStage = (next: VentStage) => {
		stageRef.current = next;
		setStageState(next);
	};
	const [micOff, setMicOff] = useState(false);
	const startedAt = useRef(0);
	const gate = useRef({ answered: false, burnt: false });
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(
		() => () => {
			if (timer.current) {
				clearTimeout(timer.current);
			}
		},
		[]
	);
	usePretendVoice(stage === "recording", VOICE[fx.voice], level);
	const { reply, capReached } = ANSWERS[fx.answer];

	const advance = () => {
		if (
			gate.current.answered &&
			gate.current.burnt &&
			stageRef.current === "processing"
		) {
			setStage(reply ? "heard" : "gone");
		}
	};

	return {
		actions: {
			burnt: () => {
				gate.current.burnt = true;
				advance();
			},
			close: () => router.back(),
			drop: (reason) => {
				if (reason !== "unmounted") {
					router.back();
				}
			},
			finish: () => {
				if (stageRef.current === "heard") {
					setStage("gone");
				}
			},
			leave: () => router.back(),
			openSettings: ignore,
			recordedMs: () => (fx.recordedFrom ?? 0) + Date.now() - startedAt.current,
			speak: () => Promise.resolve(null),
			start: () => {
				if (fx.micOff) {
					setMicOff(true);
					return Promise.resolve("off" as const);
				}
				startedAt.current = Date.now();
				setStage("recording");
				return Promise.resolve("started" as const);
			},
			stop: () => {
				if (stageRef.current !== "recording") {
					return;
				}
				gate.current = { answered: false, burnt: false };
				setStage("processing");
				timer.current = setTimeout(
					() => {
						gate.current.answered = true;
						advance();
					},
					reduced ? ANSWER_REDUCED_MS : ANSWER_MS
				);
			},
			support: ignore,
			understand: ignore,
		},
		state: {
			capBefore: fx.capBefore ?? false,
			capReached: stage === "gone" && capReached,
			ceilingMs: CEILING_MS,
			introSeen: fx.introSeen,
			level,
			micOff,
			reply: stage === "heard" || stage === "gone" ? reply : null,
			stage,
		},
	};
}
