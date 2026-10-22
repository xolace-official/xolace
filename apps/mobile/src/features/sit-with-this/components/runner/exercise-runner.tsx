import { useEffect, useReducer } from "react";
import { StyleSheet, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { AppText } from "@/src/components/shared/app-text";
import { PillButton } from "@/src/components/shared/pill-button";
import { PreRollCard } from "@/src/features/sit-with-this/components/pre-roll-card";
import { BeatRenderer } from "./beat-renderer";
import { runnerReducer } from "./exercise-runner.reducer";
import type { ExerciseData, RunnerPhase } from "./exercise-runner.types";

const EASING: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];
const EASE_FADE_INITIAL = { opacity: 0 };
const EASE_FADE_ANIMATE = { opacity: 1 };
const EASE_SWAP_TRANSITION = {
	delay: 3000,
	duration: 600,
	easing: EASING,
	type: "timing" as const,
};
const EASE_CLOSE_TRANSITION = {
	duration: 600,
	easing: EASING,
	type: "timing" as const,
};
const EASE_DONE_TRANSITION = {
	duration: 400,
	easing: EASING,
	type: "timing" as const,
};
const EASE_LEAVE_TRANSITION = {
	delay: 400,
	duration: 400,
	easing: EASING,
	type: "timing" as const,
};

type Props = {
	exercise: ExerciseData;
	reducedMotion: boolean;
	showPreRoll?: boolean;
	onComplete: () => Promise<void>;
	onExitEarly: () => Promise<void>;
	onSwap?: () => void;
};

export function ExerciseRunner({
	exercise,
	reducedMotion,
	showPreRoll = true,
	onComplete,
	onExitEarly,
	onSwap,
}: Props) {
	const steps = [...exercise.exercise.steps].sort((a, b) => a.order - b.order);
	const totalBeats = steps.length;

	const initialPhase: RunnerPhase = showPreRoll
		? { kind: "pre_roll" }
		: totalBeats === 0
			? { doneEnabled: false, kind: "close" }
			: { beatIndex: 0, kind: "playing" };

	const [phase, dispatch] = useReducer(runnerReducer, initialPhase);

	useEffect(() => {
		if (phase.kind === "close" && !phase.doneEnabled) {
			const t = setTimeout(() => dispatch({ type: "UNLOCK_DONE" }), 2000);
			return () => clearTimeout(t);
		}
	}, [phase]);

	useEffect(() => {
		if (phase.kind === "playing" && !steps[phase.beatIndex]) {
			dispatch({ totalBeats, type: "BEAT_COMPLETE" });
		}
	}, [phase, steps, totalBeats]);

	useEffect(() => {
		if (phase.kind === "done") {
			onComplete();
		}
		// onComplete is stable (wrapped in useCallback at call site)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [phase.kind]);

	const handleBeatComplete = () => {
		dispatch({ totalBeats, type: "BEAT_COMPLETE" });
	};

	if (phase.kind === "pre_roll") {
		return (
			<View className="flex-1">
				<PreRollCard onBegin={() => dispatch({ type: "BEGIN" })} />
			</View>
		);
	}

	if (phase.kind === "playing") {
		const step = steps[phase.beatIndex];
		if (!step) {
			return null;
		}
		return (
			<View className="flex-1 items-center justify-center">
				<BeatRenderer
					key={`beat-${phase.beatIndex}`}
					onComplete={handleBeatComplete}
					reducedMotion={reducedMotion}
					slots={exercise.slots}
					step={step}
				/>
				{onSwap && (
					<EaseView
						animate={EASE_FADE_ANIMATE}
						className="absolute bottom-8"
						initialAnimate={EASE_FADE_INITIAL}
						transition={EASE_SWAP_TRANSITION}
					>
						<AppText
							className="text-center text-foreground/30 text-sm"
							onPress={onSwap}
						>
							Something different
						</AppText>
					</EaseView>
				)}
			</View>
		);
	}

	if (phase.kind === "close") {
		return (
			<EaseView
				animate={EASE_FADE_ANIMATE}
				className="flex-1 items-center justify-center gap-8 px-8"
				initialAnimate={EASE_FADE_INITIAL}
				transition={EASE_CLOSE_TRANSITION}
			>
				<AppText className="text-center font-semibold text-2xl text-foreground">
					You stayed.
				</AppText>
				{phase.doneEnabled ? (
					<EaseView
						animate={EASE_FADE_ANIMATE}
						initialAnimate={EASE_FADE_INITIAL}
						transition={EASE_DONE_TRANSITION}
					>
						<PillButton
							label="Done"
							onPress={() => dispatch({ type: "DONE" })}
						/>
					</EaseView>
				) : (
					<View style={styles.invisible}>
						<PillButton disabled label="Done" onPress={() => {}} />
					</View>
				)}
				<EaseView
					animate={EASE_FADE_ANIMATE}
					initialAnimate={EASE_FADE_INITIAL}
					transition={EASE_LEAVE_TRANSITION}
				>
					<AppText
						className="text-center text-foreground/40 text-sm"
						onPress={onExitEarly}
					>
						Leave early
					</AppText>
				</EaseView>
			</EaseView>
		);
	}

	return null;
}

const styles = StyleSheet.create({
	invisible: { opacity: 0 },
});
