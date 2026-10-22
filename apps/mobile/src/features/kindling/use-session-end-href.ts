import type { Href } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { usePlusEntitlement } from "@/src/features/purchases/use-plus-entitlement";
import { shouldOfferKindlingAnnouncement } from "@/src/features/kindling/kindling-announcement";

export type SessionEndPath = "solo" | "peers" | "exit";

export const sessionEndHref = (path: SessionEndPath, sessionId?: string | null): Href =>
  sessionId ? `/session-end?path=${path}&sessionId=${sessionId}` : `/session-end?path=${path}`;

/**
 * Where a finished path goes next (#458): straight to session-end, or via the
 * kindling announcement when the session qualifies. Subscribed from the path
 * screen's mount so the answer is in hand by the time the activity ends; if
 * it isn't, the user goes straight to session-end (the slot there still shows).
 */
export function useSessionEndHref(sessionId: Id<"sessions"> | string | null) {
  const { isPlus, isResolved } = usePlusEntitlement();
  const qualifies = useQuery(
    api.paths.isKindlingQualifyingSession,
    sessionId ? { sessionId: sessionId as Id<"sessions"> } : "skip",
  );
  const variant = shouldOfferKindlingAnnouncement({ qualifies, isPlus, isResolved });

  return (path: SessionEndPath): Href =>
    variant === "none" || !sessionId
      ? sessionEndHref(path, sessionId)
      : `/kindling-announcement?variant=${variant}&path=${path}&sessionId=${sessionId}`;
}
