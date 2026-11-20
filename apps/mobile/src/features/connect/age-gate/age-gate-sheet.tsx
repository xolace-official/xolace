import { View } from "react-native";
import { EaseView, FADE_IN } from "@/design/ease";
import { AgeAsk } from "./age-ask";
import { useAgeSheetScreen } from "./age-gate-data";
import { AgeOutcome } from "./age-outcome";

/**
 * The age gate (C2): a native form sheet that fits its content (`/age-gate`, `fitSheet`), laid
 * out as the settings kit's sheets. The question, then wherever its answer leads; an outcome
 * fades in (200 ms) and the sheet resizes to it.
 */
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
