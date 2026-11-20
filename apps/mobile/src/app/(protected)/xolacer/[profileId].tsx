import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { XolacerData } from "@/features/connect/xolacer/xolacer-data";
import { XolacerScreen } from "@/features/connect/xolacer/xolacer-screen";
import { concernParams } from "@/features/feedback/feedback-model";

/** `specialty` is context for "others listen to this too"; `stepId` is the Kindling twig that led
 * here, tended once a request is sent. The feedback sheet is its own feature, so Report reaches it
 * from here. */
export default function XolacerProfileRoute() {
	const { profileId, specialty, stepId } = useLocalSearchParams<{
		profileId: string;
		specialty?: string;
		stepId?: string;
	}>();
	const router = useRouter();
	const pathname = usePathname();
	return (
		<XolacerData
			reportTo={(subject) =>
				router.push({
					params: concernParams(subject, pathname),
					pathname: "/feedback",
				})
			}
			route={{ profileId, specialty, stepId }}
		>
			<XolacerScreen />
		</XolacerData>
	);
}
