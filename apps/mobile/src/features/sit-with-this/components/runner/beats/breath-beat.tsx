import { useEffect, useRef } from "react";
import { StyleSheet } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import type { Pattern } from "react-native-pulsar";
import { usePatternComposer } from "react-native-pulsar";
import { AppText } from "@/components/shared/app-text";
import { DualBreathCanvas } from "@/features/sit-with-this/components/dual-breath/dual-breath-canvas";
import {
	type BreathPattern,
	type PacedOrbHandle,
	TIMINGS,
} from "@/features/sit-with-this/components/paced-orb";
import type { BreathPhase } from "@/lib/haptics";

const EASE: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];
const INITIAL_FADE = { opacity: 0 };
const VISIBLE_FADE = { opacity: 1 };
const CONTENT_TRANSITION = {
	duration: 600,
	easing: EASE,
	type: "timing",
} as const;

const isWeb = process.env.EXPO_OS === "web";

function buildInhalePattern(ms: number): Pattern {
	return {
		continuousPattern: {
			amplitude: [
				{ time: 0, value: 0.35 },
				{ time: ms * 0.7, value: 0.9 },
				{ time: ms, value: 1.0 },
			],
			frequency: [
				{ time: 0, value: 0.15 },
				{ time: ms, value: 0.15 },
			],
		},
		discretePattern: [],
	};
}

function buildExhalePattern(ms: number): Pattern {
	return {
		continuousPattern: {
			amplitude: [
				{ time: 0, value: 1.0 },
				{ time: ms * 0.5, value: 0.5 },
				{ time: ms, value: 0.0 },
			],
			frequency: [
				{ time: 0, value: 0.12 },
				{ time: ms, value: 0.12 },
			],
		},
		discretePattern: [],
	};
}

const TOP_HOLD_PATTERN: Pattern = {
	continuousPattern: { amplitude: [], frequency: [] },
	discretePattern: [{ amplitude: 0.5, frequency: 0.3, time: 0 }],
};

type Props = {
	content: string;
	breathPattern: BreathPattern;
	breathCycles: number;
	reducedMotion: boolean;
	onComplete: () => void;
};

export function BreathBeat({
	content,
	breathPattern,
	breathCycles,
	reducedMotion,
	onComplete,
}: Props) {
	const orbRef = useRef<PacedOrbHandle>(null);
	const doneRef = useRef(false);

	const steps = TIMINGS[breathPattern];
	const inhaleMs = steps.find((s) => s.phase === "inhale")?.duration ?? 4000;
	const exhaleMs = steps.find((s) => s.phase === "exhale")?.duration ?? 8000;

	const inhaleComposer = usePatternComposer(buildInhalePattern(inhaleMs));
	const topComposer = usePatternComposer(TOP_HOLD_PATTERN);
	const exhaleComposer = usePatternComposer(buildExhalePattern(exhaleMs));

	useEffect(() => {
		let cancelled = false;

		const onPhaseTransition =
			reducedMotion || isWeb
				? undefined
				: (phase: BreathPhase, _durationMs: number) => {
						switch (phase) {
							case "inhale":
								inhaleComposer.play();
								break;
							case "top":
								topComposer.play();
								break;
							case "exhale":
								exhaleComposer.play();
								break;
						}
					};

		orbRef.current
			?.playCycle(breathPattern, breathCycles, onPhaseTransition)
			.then(() => {
				if (!(cancelled || doneRef.current)) {
					doneRef.current = true;
					onComplete();
				}
			});

		return () => {
			cancelled = true;
		};
		// Mount-once: breath props are fixed for a beat's lifetime
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<EaseView
			animate={VISIBLE_FADE}
			initialAnimate={INITIAL_FADE}
			style={styles.root}
			transition={CONTENT_TRANSITION}
		>
			<DualBreathCanvas reducedMotion={reducedMotion} ref={orbRef} />
			<AppText
				accessibilityLiveRegion="polite"
				className="px-8 py-4 text-center text-foreground/55 text-sm"
			>
				{content}
			</AppText>
		</EaseView>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1, width: "100%" },
});
