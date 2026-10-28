import { Stack } from "expo-router";
import { SessionDetailsScreen } from "@/features/timeline/components/screens/SessionDetailsScreen";

const NO_HEADER = { headerShown: false };

const SessionDetails = () => (
	<>
		<Stack.Screen options={NO_HEADER} />
		<SessionDetailsScreen />
	</>
);

export default SessionDetails;
