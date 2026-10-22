// Minutes left after a talk (#596), under its mirror, once its charge lands.
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AppText } from "@/src/components/shared/app-text";
import { talkTimeLine } from "@/src/features/talk/talk-copy";
import { useTalkTime } from "@/src/features/talk/use-talk-time";

export function TalkTimeLeft({ sessionId }: { sessionId: Id<"sessions"> | null }) {
  // The reflect screen already holds this subscription.
  const session = useQuery(api.sessions.getById, sessionId ? { sessionId } : "skip");
  const time = useTalkTime(session?.entryType === "talk");
  const line = time && !time.settling ? talkTimeLine(time.secondsLeft) : null;
  return line ? <AppText className="mt-4 text-xs text-muted">{line}</AppText> : null;
}
