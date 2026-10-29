import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { Redirect, useLocalSearchParams } from "expo-router";
import { BridgeScreen } from "@/features/trusted-bridge/components/screen/bridge-screen";

type Params = {
	sessionId: string;
	stepId?: string;
};

export default function TrustedBridge() {
	const { sessionId, stepId } = useLocalSearchParams<Params>();

	// A deep link can arrive with no id; bail home rather than cast undefined.
	if (typeof sessionId !== "string" || sessionId.trim().length === 0) {
		return <Redirect href="/" />;
	}

	return (
		<BridgeScreen
			sessionId={sessionId as Id<"sessions">}
			stepId={stepId as Id<"path_steps"> | undefined}
		/>
	);
}
