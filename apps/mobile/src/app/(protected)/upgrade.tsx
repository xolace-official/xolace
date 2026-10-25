import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useLocalSearchParams } from "expo-router";
import { PaywallScreen } from "@/src/features/purchases/screens/paywall-screen";
import type { PaywallSurface } from "@/src/features/purchases/use-paywall";

export default function Route() {
	const { surface, sessionId } = useLocalSearchParams<{
		surface?: PaywallSurface;
		sessionId?: Id<"sessions">;
	}>();
	return <PaywallScreen sessionId={sessionId} surface={surface} />;
}
