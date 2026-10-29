import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useLocalSearchParams } from "expo-router";
import { SessionEndScreen } from "@/features/session-end/components/session-end-screen";

type Params = {
	path: "solo" | "peers" | "exit";
	sessionId?: string;
};

export default function SessionEnd() {
	const { path, sessionId } = useLocalSearchParams<Params>();
	// The session is already completed, so getActive is null; the path screens
	// carry its id and this screen only records optional feedback.
	return (
		<SessionEndScreen
			path={path ?? "exit"}
			sessionId={(sessionId as Id<"sessions"> | undefined) ?? null}
		/>
	);
}
