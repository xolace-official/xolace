import { useKeepAwake } from "expo-keep-awake";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import { VentClose } from "@/features/vent/chrome/vent-close";
import { VentCrisis } from "@/features/vent/chrome/vent-crisis";
import { VentGone } from "@/features/vent/chrome/vent-gone";
import { VentIntro } from "@/features/vent/chrome/vent-intro";
import { VentReady } from "@/features/vent/chrome/vent-ready";
import { ParticleField } from "@/features/vent/field/particle-field";
import { useVentGestures } from "@/features/vent/flow/vent-gestures";
import { useVentScreen } from "@/features/vent/vent-data";
import { ReplyWords } from "@/features/vent/words/reply-words";

/**
 * Vent v2 (handoff `vent.md`): production's ritual on the same dark room in every theme, status
 * bar hidden, the screen kept awake. Say it, let it go, watch it burn, a few words back, they
 * burn too, "Gone.", and it closes itself.
 */
export function VentScreen() {
	// Released on unmount, so the lock never outlives the screen.
	useKeepAwake();
	const { state, actions } = useVentScreen();
	const gesture = useVentGestures(state.phase, actions.burst, actions.flick);
	const words = state.phase === "heard" || state.phase === "ash";

	return (
		<GestureDetector gesture={gesture}>
			<View className="flex-1 bg-vent-page">
				<StatusBar hidden />
				<ParticleField />
				<VentIntro />
				<VentReady />
				{words ? <ReplyWords /> : null}
				<VentGone />
				<VentCrisis />
				<VentClose />
			</View>
		</GestureDetector>
	);
}
