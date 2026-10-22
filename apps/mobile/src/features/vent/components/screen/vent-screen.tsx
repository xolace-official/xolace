import { useKeepAwake } from "expo-keep-awake";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SymbolView } from "expo-symbols";
import { PressableFeedback } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
	Easing,
	FadeIn,
	FadeOut,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withSequence,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/src/components/shared/app-text";
import { useVentFlow } from "@/src/features/vent/hooks/use-vent-flow";
import { playSoftPress } from "@/src/lib/haptics";
import { useAppStore } from "@/src/store/store";
import { useVentSounds } from "../../hooks/use-vent-sounds";
import { ParticleField, type ParticleStage } from "../particles/particle-field";
import { VentAcknowledgement } from "../vent-acknowledgement";
import { VentGone } from "../vent-gone";
import { VentIntro } from "../vent-intro";
import { VentMicButton } from "../vent-mic-button";

// The ritual screen is the same full-dark surface in every theme (design spec).
const VENT_BG = { backgroundColor: "#0A0A0D" };
const CLOSE_ICON = { android: "close", ios: "xmark", web: "close" } as const;
const CLOSE_TINT = "#F5F0E8";
const CLOSE_ICON_STYLE = { opacity: 0.5 };

const STAGE_FOR_STATE: Record<string, ParticleStage> = {
	error: "enter",
	gone: "done",
	heard: "done",
	idle: "enter",
	processing: "burning",
	recording: "recording",
};

export function VentScreen() {
	// Released on unmount, so the lock never outlives the screen.
	useKeepAwake();

	const posthog = usePostHog();
	const router = useRouter();
	const ventIntroSeen = useAppStore((s) => s.ventIntroSeen);
	const setVentIntroSeen = useAppStore((s) => s.setVentIntroSeen);
	const [showIntro, setShowIntro] = useState(!ventIntroSeen);

	const {
		state,
		displayWords,
		isCrisis,
		capReached,
		startVent,
		stopVent,
		onBurnComplete,
		onGoneComplete,
		metering,
		durationMs,
		maxDurationMs,
	} = useVentFlow();

	useVentSounds(state);

	const burnSkip = useSharedValue(0);
	const labelOpacity = useSharedValue(0);

	// "Speak your weight" — fades in once the sphere settles, fades out 3s later.
	useEffect(() => {
		if (state === "idle") {
			labelOpacity.set(
				withDelay(
					3200,
					withSequence(
						withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) }),
						withDelay(3000, withTiming(0, { duration: 800 }))
					)
				)
			);
		} else {
			labelOpacity.set(withTiming(0, { duration: 300 }));
		}
	}, [state, labelOpacity]);

	// Soft ceiling: auto-release at the max duration. No visible timer —
	// the field simply stops expanding at max radius (handled by the engine).
	useEffect(() => {
		if (state === "recording" && durationMs >= maxDurationMs) {
			stopVent();
		}
	}, [state, durationMs, maxDurationMs, stopVent]);

	const labelStyle = useAnimatedStyle(() => ({ opacity: labelOpacity.get() }));

	// Pinch-spread accelerant: spreading two fingers during the burn jumps
	// straight to the explosion. Inactive in every other state.
	const pinch = Gesture.Pinch()
		.enabled(state === "processing")
		.onUpdate((e) => {
			"worklet";
			if (e.scale > 1.15) {
				burnSkip.set(1);
			}
		});

	const handleClose = () => {
		playSoftPress();
		posthog.capture("vent_closed", { state });
		router.back();
	};

	if (showIntro) {
		return (
			<View className="flex-1" style={VENT_BG}>
				<StatusBar hidden />
				<VentIntro
					onUnderstand={() => {
						posthog.capture("vent_intro_completed");
						setVentIntroSeen(true);
						setShowIntro(false);
					}}
				/>
			</View>
		);
	}

	const showChrome = state === "idle" || state === "heard" || state === "gone";

	return (
		<GestureDetector gesture={pinch}>
			<View className="flex-1" style={VENT_BG}>
				<StatusBar hidden />

				<ParticleField
					burnSkip={burnSkip}
					metering={metering}
					onBurnComplete={onBurnComplete}
					stage={STAGE_FOR_STATE[state] ?? "enter"}
				/>

				{/* Close — top-right, hidden while recording/burning */}
				{showChrome && (
					<Animated.View
						className="absolute top-16 right-6 z-10"
						entering={FadeIn.duration(400)}
						exiting={FadeOut.duration(300)}
					>
						<PressableFeedback
							accessibilityLabel="Close and return"
							accessibilityRole="button"
							hitSlop={12}
							onPress={handleClose}
						>
							<View className="h-9 w-9 items-center justify-center rounded-full bg-white/5">
								<SymbolView
									name={CLOSE_ICON}
									size={15}
									style={CLOSE_ICON_STYLE}
									tintColor={CLOSE_TINT}
								/>
							</View>
						</PressableFeedback>
					</Animated.View>
				)}

				{/* "Speak your weight" — below the sphere */}
				<Animated.View
					className="absolute inset-x-0 top-[68%] items-center"
					pointerEvents="none"
					style={labelStyle}
				>
					<AppText className="text-[#F5F0E8]/40 text-sm">
						Tap on the Mic to Speak your weight
					</AppText>
				</Animated.View>

				{/* Mic / stop — fades out the moment the burn begins */}
				{(state === "idle" || state === "recording") && (
					<Animated.View
						className="absolute inset-x-0 bottom-25 items-center"
						entering={FadeIn.duration(500).delay(600)}
						exiting={FadeOut.duration(250)}
					>
						<VentMicButton
							onPress={state === "recording" ? stopVent : startVent}
							recording={state === "recording"}
						/>
					</Animated.View>
				)}

				{/* The coda */}
				{state === "heard" && displayWords && (
					<VentAcknowledgement words={displayWords} />
				)}

				{/* The period */}
				{state === "gone" && (
					<VentGone
						capReached={capReached}
						isCrisis={isCrisis}
						onDone={onGoneComplete}
					/>
				)}

				{/* DEV ONLY — tap to re-activate the first-run intro for testing */}
				{__DEV__ && state === "idle" && (
					<PressableFeedback
						className="absolute bottom-5 left-4 p-3"
						hitSlop={8}
						onPress={() => {
							setVentIntroSeen(false);
							setShowIntro(true);
						}}
					>
						<AppText className="text-[#F5F0E8]/30 text-xs">↺ intro</AppText>
					</PressableFeedback>
				)}
			</View>
		</GestureDetector>
	);
}
