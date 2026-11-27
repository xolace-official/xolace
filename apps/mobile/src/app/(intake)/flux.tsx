import { useEffect } from "react";
import { BackHandler, Platform } from "react-native";
import { suggestHandle } from "@/features/intake/answer-rules";
import { consumesBack } from "@/features/intake/v2/intake-back";
import { IntakeBlank } from "@/features/intake/v2/intake-screen";
import { IntakeV2Flow } from "@/features/intake/v2/intake-v2-flow";
import { FirstLookStep } from "@/features/plus/first-look/first-look-step";
import { useFullContext } from "@/lib/convex/use-full-context";

export default function IntakeFlux() {
	useEffect(() => {
		if (Platform.OS !== "android") {
			return;
		}
		const sub = BackHandler.addEventListener("hardwareBackPress", () =>
			consumesBack("flux")
		);
		return () => sub.remove();
	}, []);

	const context = useFullContext();
	if (context === undefined) {
		return <IntakeBlank />;
	}
	return (
		<IntakeV2Flow
			initialName={context.preferences?.displayName || suggestHandle()}
			PlusOffer={FirstLookStep}
		/>
	);
}
