/** The session end's fixture adapter: the real screen under a provider filled
 * from fixtures, with the pieces the route composes in from the dev bridge. Taps save nothing and go nowhere, except Continue after a
 * heavier answer, which opens the real follow-up sheet (it saves nothing
 * without a session). */
import { router } from "expo-router";
import { END_PARTS } from "@/dev/session-end-slots";
import { useFollowUpAsk } from "../follow-up/follow-up-ask";
import { followUpBucket } from "../mood-scale";
import type { Scene } from "../scene";
import { type SessionEnd, SessionEndProvider } from "../session-end-data";
import { SessionEndScreen } from "../session-end-screen";

const ignore = () => undefined;
const ACTIONS: SessionEnd["actions"] = {
	another: ignore,
	askFollowUp: (step, onClosed) => {
		useFollowUpAsk
			.getState()
			.open({ bucket: followUpBucket(step), onClosed, sessionId: null });
		router.push("/session-follow-up");
	},
	done: ignore,
	nextShown: ignore,
	openNext: ignore,
	saveMood: ignore,
	share: ignore,
};

export function FixtureScreen({
	state,
	scene,
}: {
	state: SessionEnd["state"];
	scene?: Scene;
}) {
	return (
		<SessionEndProvider
			value={{ actions: ACTIONS, state: { ...state, parts: END_PARTS } }}
		>
			<SessionEndScreen scene={scene} />
		</SessionEndProvider>
	);
}
