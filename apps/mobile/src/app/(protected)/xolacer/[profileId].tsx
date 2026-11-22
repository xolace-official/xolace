import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { XolacerData } from "@/features/connect/xolacer/xolacer-data";
import { XolacerScreen } from "@/features/connect/xolacer/xolacer-screen";
import { concernParams } from "@/features/feedback/feedback-model";

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
