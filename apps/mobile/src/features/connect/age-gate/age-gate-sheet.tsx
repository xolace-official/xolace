import { View } from "react-native";
import { EaseView, FADE_IN } from "@/design/ease";
import { AgeAsk } from "./age-ask";
import { useAgeSheetScreen } from "./age-gate-data";
import { AgeOutcome } from "./age-outcome";

export function AgeGateSheet() {
	const { state } = useAgeSheetScreen();
	return (
		<View className="bg-surface px-5 pt-6.5 pb-8.5">
			{state.step === "ask" ? (
				<AgeAsk />
			) : (
				<EaseView key={state.step} {...FADE_IN}>
					<AgeOutcome />
				</EaseView>
			)}
		</View>
	);
}
