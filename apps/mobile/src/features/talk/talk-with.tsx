// A talk's mirror says who the talk was with (#601); the typed mirror stays unsigned.
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AppText } from "@/src/components/shared/app-text";

export function TalkWith({ sessionId }: { sessionId: Id<"sessions"> | null }) {
  // The reflect screen already holds this subscription.
  const session = useQuery(api.sessions.getById, sessionId ? { sessionId } : "skip");
  if (session?.entryType !== "talk" || !session.companionName) return null;
  return <AppText className="mb-3 text-xs text-muted">From your talk with {session.companionName}</AppText>;
}
