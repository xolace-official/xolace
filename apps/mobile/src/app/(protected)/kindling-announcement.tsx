import { useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { usePostHog } from "posthog-react-native";
import type { Id } from "@/convex/_generated/dataModel";
import { KindlingAnnouncementScreen } from "@/src/features/kindling/components/kindling-announcement-screen";
import { sessionEndHref, type SessionEndPath } from "@/src/features/kindling/use-session-end-href";
import { usePlusEntitlement } from "@/src/features/purchases/use-plus-entitlement";
import { usePaywall } from "@/src/features/purchases/use-paywall";

type Params = { variant: "plus" | "free"; path: SessionEndPath; sessionId: string };

/**
 * The beat between a finished path and session-end (#458). Only reached via
 * `useSessionEndHref`, which already decided the session qualifies; the
 * session is completed before we get here, so both exits land on the exact
 * session-end route the path would have taken.
 */
export default function KindlingAnnouncement() {
  const { variant, path, sessionId } = useLocalSearchParams<Params>();
  const { isPlus } = usePlusEntitlement();
  const openPaywall = usePaywall((s) => s.open);
  const posthog = usePostHog();
  const free = !isPlus && variant === "free";
  // Its own surface so the funnel tells this beat from session-end's slot.
  useEffect(() => {
    if (free) posthog.capture("plus_upsell_shown", { surface: "kindling_announcement" });
  }, [free, posthog]);
  const toSessionEnd = () => router.replace(sessionEndHref(path ?? "exit", sessionId));

  return (
    <KindlingAnnouncementScreen
      // A purchase from the paywall CTA returns here as Plus.
      variant={free ? "free" : "plus"}
      onSkip={toSessionEnd}
      onContinue={toSessionEnd}
      onPaywall={() => {
        posthog.capture("plus_upsell_tapped", { surface: "kindling_announcement" });
        openPaywall("kindling", { sessionId: sessionId as Id<"sessions"> });
      }}
    />
  );
}
