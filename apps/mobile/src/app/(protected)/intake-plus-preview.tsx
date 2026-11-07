/** Dev only: intake v2's Xolace+ step on sample plans (#713). Opened from Dev tools; a
 * release build sends anyone who lands here home. */
import { Redirect } from "expo-router";
import { PlusStepPreview } from "@/features/intake/v2/plus/plus-step-preview";

export default function IntakePlusPreview() {
	if (!__DEV__) {
		return <Redirect href="/(protected)" />;
	}
	return <PlusStepPreview />;
}
