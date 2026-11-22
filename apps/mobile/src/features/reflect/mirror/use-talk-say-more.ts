import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { router } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { MIN_TALK_S } from "@/lib/talk/talk-time";
import { useTalkTime } from "@/lib/talk/use-talk-time";

export function useTalkSayMore(sessionId: Id<"sessions"> | null) {
	const posthog = usePostHog();
	const session = useQuery(
		api.sessions.getById,
		sessionId ? { sessionId } : "skip"
	);
	const isTalk = session?.entryType === "talk";
	const time = useTalkTime(isTalk);
	if (!(isTalk && sessionId)) {
		return null;
	}
	return {
		offered: time != null && time.secondsLeft >= MIN_TALK_S,
		open: () => {
			posthog.capture("mirror_say_more", { entry_type: "talk", sessionId });
			router.push({ params: { reopen: sessionId }, pathname: "/talk" });
		},
	};
}
