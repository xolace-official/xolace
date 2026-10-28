import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useLocalSearchParams } from "expo-router";
import { SessionEndScreen } from "@/features/session-end/components/session-end-screen";

type Params = {
	path: "solo" | "peers" | "exit";
	sessionId?: string;
};

export default function SessionEnd() {
	const { path, sessionId } = useLocalSearchParams<Params>();
	// The session is already completed before we get here; the path screens carry
	// its id so this screen reads it directly (getActive is now null) and only
	// records optional post-session feedback.
	return (
		<SessionEndScreen
			path={path ?? "exit"}
			sessionId={(sessionId as Id<"sessions"> | undefined) ?? null}
		/>
	);
}
