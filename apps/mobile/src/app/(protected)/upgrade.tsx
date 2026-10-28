import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useLocalSearchParams } from "expo-router";
import { PaywallScreen } from "@/features/purchases/screens/paywall-screen";
import type { PaywallSurface } from "@/features/purchases/use-paywall";
import { useCompanionName } from "@/features/talk/use-companion-name";

export default function Route() {
	const { surface, sessionId } = useLocalSearchParams<{
		surface?: PaywallSurface;
		sessionId?: Id<"sessions">;
	}>();
	const companionName = useCompanionName();
	return (
		<PaywallScreen
			companionName={companionName}
			sessionId={sessionId}
			surface={surface}
		/>
	);
}
