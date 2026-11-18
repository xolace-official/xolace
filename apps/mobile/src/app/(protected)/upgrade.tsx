import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useLocalSearchParams } from "expo-router";
import { PlusData } from "@/features/plus/plus-data";
import { PlusScreen } from "@/features/plus/plus-screen";
import type { PaywallSurface } from "@/features/purchases/use-paywall";
import { useCompanionName } from "@/lib/talk/use-companion-name";

export default function Route() {
	const { surface, sessionId } = useLocalSearchParams<{
		surface?: PaywallSurface;
		sessionId?: Id<"sessions">;
	}>();
	const companionName = useCompanionName();
	return (
		<PlusData
			companionName={companionName}
			sessionId={sessionId}
			surface={surface}
		>
			<PlusScreen />
		</PlusData>
	);
}
