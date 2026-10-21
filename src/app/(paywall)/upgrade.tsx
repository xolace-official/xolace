import { useLocalSearchParams } from "expo-router";
import { PaywallScreen } from "@/src/features/purchases/screens/paywall-screen";
import type { PaywallSurface } from "@/src/features/purchases/use-paywall";
import type { Id } from "@/convex/_generated/dataModel";

export default function Route() {
  const { surface, sessionId } = useLocalSearchParams<{
    surface?: PaywallSurface;
    sessionId?: Id<"sessions">;
  }>();
  return <PaywallScreen surface={surface} sessionId={sessionId} />;
}
