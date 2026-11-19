import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useLocalSearchParams } from "expo-router";
import { LetterTile } from "@/features/letters/end-card/letter-tile";
import { useEndLetters } from "@/features/letters/end-card/use-end-letters";
import { SessionEndData } from "@/features/session-end/session-end-data";
import { pathOf } from "@/features/session-end/session-end-model";
import { SessionEndScreen } from "@/features/session-end/session-end-screen";

type Params = { path?: string; sessionId?: string };

/** After a session, with letters' two cards composed in: features meet in routes. The session
 * is already completed, so `getActive` is null: the path screens carry its id. */
export default function SessionEnd() {
	const { path, sessionId } = useLocalSearchParams<Params>();
	const letters = useEndLetters();
	return (
		<SessionEndData
			letters={{ ...letters, tile: <LetterTile /> }}
			path={pathOf(path)}
			sessionId={(sessionId as Id<"sessions"> | undefined) ?? null}
		>
			<SessionEndScreen />
		</SessionEndData>
	);
}
