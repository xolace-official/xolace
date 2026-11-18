import { useLocalSearchParams } from "expo-router";
import { XolacerData } from "@/features/connect/xolacer/xolacer-data";
import { XolacerScreen } from "@/features/connect/xolacer/xolacer-screen";
import { useTray } from "@/features/feedback-tray/engine/tray-provider";
import type { Trays } from "@/features/feedback-tray/screens/registry";

/** `specialty` is context for "others listen to this too"; `stepId` is the Kindling twig that led
 * here, tended once a request is sent. The concern tray is its own feature, so Report reaches it
 * from here. */
export default function XolacerProfileRoute() {
	const { profileId, specialty, stepId } = useLocalSearchParams<{
		profileId: string;
		specialty?: string;
		stepId?: string;
	}>();
	const { show } = useTray<Trays>();
	return (
		<XolacerData
			reportTo={(subject) => show("report", { kind: "concern", subject })}
			route={{ profileId, specialty, stepId }}
		>
			<XolacerScreen />
		</XolacerData>
	);
}
