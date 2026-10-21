// "Say more" on a talk's mirror opens the talk again (#604), not the typed
// clarify. Not offered under the 3-min minimum (#582); the server refuses it too.
import { router } from "expo-router";
import { useQuery } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { MIN_TALK_S } from "@/src/features/talk/talk-copy";
import { useTalkTime } from "@/src/features/talk/use-talk-time";

/** Null for a typed mirror. */
export function useTalkSayMore(sessionId: Id<"sessions"> | null) {
  const posthog = usePostHog();
  // The reflect screen already holds this subscription.
  const session = useQuery(api.sessions.getById, sessionId ? { sessionId } : "skip");
  const isTalk = session?.entryType === "talk";
  // Low while the talk's charge is still landing: it shows once it has.
  const time = useTalkTime(isTalk);
  if (!isTalk || !sessionId) return null;
  return {
    offered: time != null && time.secondsLeft >= MIN_TALK_S,
    open: () => {
      posthog.capture("mirror_say_more", { sessionId, entry_type: "talk" });
      router.push({ pathname: "/talk", params: { reopen: sessionId } });
    },
  };
}
