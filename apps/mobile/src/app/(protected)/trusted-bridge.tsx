import { Redirect, useLocalSearchParams } from "expo-router";
import { BridgeScreen } from "@/src/features/trusted-bridge/components/screen/bridge-screen";
import type { Id } from "@/convex/_generated/dataModel";

type Params = {
  sessionId: string;
  stepId?: string;
};

export default function TrustedBridge() {
  const { sessionId, stepId } = useLocalSearchParams<Params>();

  // Guard the route boundary: a deep link or malformed navigation can arrive
  // with no id. Bail home rather than cast undefined into requestBridgeDraft.
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
