import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useLocalSearchParams } from "expo-router";
import { SessionEndData } from "@/features/session-end/session-end-data";
import { pathOf } from "@/features/session-end/session-end-model";
import { SessionEndScreen } from "@/features/session-end/session-end-screen";

type Params = { path?: string; sessionId?: string };

/** After a session. The session is already completed, so `getActive` is null:
 * the path screens carry its id. */
export default function SessionEnd() {
	const { path, sessionId } = useLocalSearchParams<Params>();
	return (
		<SessionEndData
			path={pathOf(path)}
			sessionId={(sessionId as Id<"sessions"> | undefined) ?? null}
		>
			<SessionEndScreen />
		</SessionEndData>
	);
}
