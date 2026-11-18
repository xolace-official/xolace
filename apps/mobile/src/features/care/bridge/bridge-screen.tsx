import { useNavigation } from "expo-router";
import { useEffect } from "react";
import { BackHandler, View } from "react-native";
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
 * top; on the draft the swipe back is off and Android's back steps back, so a half-edited
 * draft isn't lost to a stray swipe (Back returns to who it's for instead).
 */
export function BridgeScreen() {
	const { state, actions } = useBridgeScreen();
	const navigation = useNavigation();

	useEffect(() => {
		navigation.setOptions({ gestureEnabled: state.step !== "draft" });
	}, [navigation, state.step]);

	// Android's back (button or gesture) on the draft goes where Back does, to who it's for,
	// instead of dropping the draft. Not `usePreventRemove`: Done and Not right now leave on
	// purpose with `dismissTo`.
	const onDraft = state.step === "draft";
	const back = actions.back;
	useEffect(() => {
		if (!onDraft) {
			return;
		}
		const sub = BackHandler.addEventListener("hardwareBackPress", () => {
			back();
			return true;
		});
		return () => sub.remove();
	}, [onDraft, back]);

	const Step = STEPS[state.step];
	return (
		<View className="flex-1 bg-background pt-safe">
			<Step />
		</View>
	);
}
