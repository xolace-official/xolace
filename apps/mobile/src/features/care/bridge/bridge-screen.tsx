import { useNavigation } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import { useBridgeScreen } from "@/features/care/bridge/bridge-data";
import { DraftStep } from "@/features/care/bridge/draft/draft-step";
import { BridgeIntro } from "@/features/care/bridge/intro/bridge-intro";
import { RecipientStep } from "@/features/care/bridge/recipient/recipient-step";

const STEPS = {
	draft: DraftStep,
	intro: BridgeIntro,
	recipient: RecipientStep,
} as const;

/**
 * Trusted Bridge: the intro the first time, then who it's for, then the draft. It draws its own
 * top; on the draft the swipe back is off, so a half-edited draft isn't lost to a stray swipe
 * (Back returns to who it's for instead).
 */
export function BridgeScreen() {
	const { state } = useBridgeScreen();
	const navigation = useNavigation();

	useEffect(() => {
		navigation.setOptions({ gestureEnabled: state.step !== "draft" });
	}, [navigation, state.step]);

	const Step = STEPS[state.step];
	return (
		<View className="flex-1 bg-background pt-safe">
			<Step />
		</View>
	);
}
