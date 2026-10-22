import { useThemeColor } from "heroui-native";
import React, {
	forwardRef,
	useEffect,
	useImperativeHandle,
	useRef,
} from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
	cancelAnimation,
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withTiming,
} from "react-native-reanimated";
import type { BreathPhase } from "@/src/lib/haptics";

export type BreathPattern =
	| "physiological_sigh"
	| "extended_exhale"
	| "slow_exhale";

export type PacedOrbHandle = {
	playCycle: (
		pattern: BreathPattern,
		cycles: number,
		onPhaseTransition?: (phase: BreathPhase, durationMs: number) => void
	) => Promise<void>;
	cancel: () => void;
};

type StepTiming = { to: number; duration: number; phase: BreathPhase };

export const TIMINGS: Record<BreathPattern, StepTiming[]> = {
	extended_exhale: [
		{ duration: 4000, phase: "inhale", to: 1.3 },
		{ duration: 8000, phase: "exhale", to: 1.0 },
	],
	physiological_sigh: [
		{ duration: 4000, phase: "inhale", to: 1.3 },
		{ duration: 1000, phase: "top", to: 1.35 },
		{ duration: 8000, phase: "exhale", to: 1.0 },
	],
	slow_exhale: [
		{ duration: 3000, phase: "inhale", to: 1.2 },
		{ duration: 6000, phase: "exhale", to: 1.0 },
	],
};

export const BREATH_CYCLE_MS: Record<BreathPattern, number> = {
	extended_exhale: TIMINGS.extended_exhale.reduce((a, s) => a + s.duration, 0),
	physiological_sigh: TIMINGS.physiological_sigh.reduce(
		(a, s) => a + s.duration,
		0
	),
	slow_exhale: TIMINGS.slow_exhale.reduce((a, s) => a + s.duration, 0),
};

const HALO_SIZE = 240;
const CORE_SIZE = 150;

const styles = StyleSheet.create({
	core: {
		borderRadius: CORE_SIZE / 2,
		height: CORE_SIZE,
		width: CORE_SIZE,
	},
	halo: {
		borderRadius: HALO_SIZE / 2,
		height: HALO_SIZE,
		position: "absolute",
		width: HALO_SIZE,
	},
	orbCenter: {
		alignItems: "center",
		height: HALO_SIZE,
		justifyContent: "center",
		width: HALO_SIZE,
	},
});

type Props = { reducedMotion?: boolean };

export const PacedOrb = forwardRef<PacedOrbHandle, Props>(
	({ reducedMotion = false }, ref) => {
		const accentColor = useThemeColor("accent");
		const scale = useSharedValue(1.0);
		const coreOpacity = useSharedValue(0.4);
		const haloOpacity = useSharedValue(0.08);

		const transitionTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

		const clearTimers = () => {
			transitionTimersRef.current.forEach(clearTimeout);
			transitionTimersRef.current = [];
		};

		useEffect(() => clearTimers, []);

		useImperativeHandle(ref, () => ({
			cancel: () => {
				clearTimers();
				cancelAnimation(scale);
				cancelAnimation(coreOpacity);
				cancelAnimation(haloOpacity);
			},
			playCycle: (pattern, cycles, onPhaseTransition) =>
				new Promise<void>((resolve) => {
					clearTimers();

					const steps = TIMINGS[pattern];
					const totalMs =
						steps.reduce((acc, s) => acc + s.duration, 0) * cycles;

					let cursorMs = 0;
					for (let i = 0; i < cycles; i++) {
						steps.forEach((step) => {
							const firedPhase = step.phase;
							const firedDuration = step.duration;
							transitionTimersRef.current.push(
								setTimeout(
									() => onPhaseTransition?.(firedPhase, firedDuration),
									cursorMs
								)
							);
							cursorMs += step.duration;
						});
					}

					if (reducedMotion) {
						transitionTimersRef.current.push(
							setTimeout(() => {
								clearTimers();
								resolve();
							}, totalMs)
						);
						return;
					}

					cancelAnimation(scale);
					cancelAnimation(coreOpacity);
					cancelAnimation(haloOpacity);

					const scaleAnims: number[] = [];
					const coreAnims: number[] = [];
					const haloAnims: number[] = [];

					for (let i = 0; i < cycles; i++) {
						steps.forEach((step, j) => {
							const isInhale = j === 0;
							scaleAnims.push(withTiming(step.to, { duration: step.duration }));
							coreAnims.push(
								withTiming(isInhale ? 0.8 : 0.4, { duration: step.duration })
							);
							haloAnims.push(
								withTiming(isInhale ? 0.15 : 0.08, { duration: step.duration })
							);
						});
					}

					if (scaleAnims.length > 0) {
						scale.set(withSequence(scaleAnims[0], ...scaleAnims.slice(1)));
						coreOpacity.set(withSequence(coreAnims[0], ...coreAnims.slice(1)));
						haloOpacity.set(withSequence(haloAnims[0], ...haloAnims.slice(1)));
					}

					transitionTimersRef.current.push(setTimeout(resolve, totalMs));
				}),
		}));

		const scaleStyle = useAnimatedStyle(() => ({
			transform: [{ scale: scale.get() }],
		}));
		const coreStyle = useAnimatedStyle(() => ({ opacity: coreOpacity.get() }));
		const haloStyle = useAnimatedStyle(() => ({ opacity: haloOpacity.get() }));

		const haloViewStyle = [
			styles.halo,
			{ backgroundColor: accentColor },
			haloStyle,
		];
		const coreViewStyle = [
			styles.core,
			{ backgroundColor: accentColor },
			coreStyle,
		];

		return (
			<Animated.View className="items-center justify-center">
				<Animated.View style={scaleStyle}>
					<View style={styles.orbCenter}>
						<Animated.View style={haloViewStyle} />
						<Animated.View style={coreViewStyle} />
					</View>
				</Animated.View>
			</Animated.View>
		);
	}
);

PacedOrb.displayName = "PacedOrb";
