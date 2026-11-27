import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useLocalSearchParams } from "expo-router";
import { PaywallData } from "@/features/plus/paywall/paywall-data";
import { PaywallScreen } from "@/features/plus/paywall/paywall-screen";
import type { PaywallSurface } from "@/features/purchases/use-paywall";
import { useCompanionName } from "@/lib/talk/use-companion-name";

export default function Route() {
	const { surface, sessionId } = useLocalSearchParams<{
		surface?: PaywallSurface;
		sessionId?: Id<"sessions">;
	}>();
	const companionName = useCompanionName();
	return (
		<PaywallData
			companionName={companionName}
			sessionId={sessionId}
			surface={surface}
		>
			<PaywallScreen />
		</PaywallData>
	);
}
