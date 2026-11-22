import type { Id } from "@xolace/backend/dataModel";
import { useLocalSearchParams } from "expo-router";
import { BridgeData } from "@/features/care/bridge/bridge-data";
import { BridgeScreen } from "@/features/care/bridge/bridge-screen";
import { ReturnTo } from "@/lib/return-to";

type Params = {
	sessionId: string;
	stepId?: string;
};

export default function TrustedBridge() {
	const { sessionId, stepId } = useLocalSearchParams<Params>();

	if (typeof sessionId !== "string" || sessionId.trim().length === 0) {
		return <ReturnTo href="/today" />;
	}

	return (
		<BridgeData
			sessionId={sessionId as Id<"sessions">}
			stepId={stepId as Id<"path_steps"> | undefined}
		>
			<BridgeScreen />
		</BridgeData>
	);
}
