import { useLocalSearchParams } from "expo-router";
import { XolacerProfileScreen } from "@/features/xolacer-chat/components/xolacer-profile-screen";

export default function XolacerProfileRoute() {
	// `specialty` is optional context for the "others listen to this too" exit;
	// `stepId` is the kindling twig that led here, tended once a request is sent.
	const { profileId, specialty, stepId } = useLocalSearchParams<{
		profileId: string;
		specialty?: string;
		stepId?: string;
	}>();
	return (
		<XolacerProfileScreen
			profileId={profileId}
			specialty={specialty}
			stepId={stepId}
		/>
	);
}
