import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { createContext, type ReactNode, use } from "react";
import type {
	NextInput,
	NextKey,
	SavedMood,
	SessionFrom,
	SessionPath,
} from "./session-end-model";
import { useSessionEndData } from "./use-session-end";

/** The listener a matched suggestion opens (`ai.xolacers.suggest.sessionSuggestion`). */
export type ListenerCard = {
	name: string;
	/** "anxiety", "work stress": what they listen to, from their specialty. */
	listensTo: string;
	photoUrl?: string;
};

/**
 * Everything the session end reads and does. Two adapters fill it: Convex in
 * the app (`SessionEndData`) and fixtures in its dev states (`dev/`). The
 * moments' own motion and answers are screen state; only what is read from the
 * backend, saved, or navigated comes through here.
 */
export type SessionEnd = {
	state: {
		/** The session and the streak are in, or 4 s have passed: the arrival can start. */
		ready: boolean;
		/** The night window: the night line, the ember face, Dusk. */
		late: boolean;
		/** Which line moment 2 shows; null for the mirror's exit. */
		from: SessionFrom | null;
		/** The distilled words to leave for someone; null: nothing to share. */
		words: string | null;
		/** The streak before and after this session; null when it couldn't be read. */
		day: { from: number; to: number } | null;
		/** The next-step slot's inputs; the screen adds the answer's step. */
		slot: Omit<NextInput, "late" | "step">;
		listener: ListenerCard | null;
		/** The heavier follow-up hasn't been answered in the last 24 hours. */
		canAskFollowUp: boolean;
	};
	actions: {
		/** Continue: the answer, saved now (fire-and-forget). */
		saveMood: (mood: SavedMood) => void;
		/** Opens the heavier follow-up sheet; `onClosed` hears its answer, or null. */
		askFollowUp: (
			step: number,
			onClosed: (answer: string | null) => void
		) => void;
		/** "Leave it" (true) or "Not this time" (false), saved at the tap. */
		share: (contributed: boolean) => void;
		/** Moment 2 opened on this card. */
		nextShown: (key: NextKey) => void;
		openNext: (key: NextKey) => void;
		/** "I'm done for now": back to Today. */
		done: () => void;
		/** "Start another": a fresh reflection. */
		another: () => void;
	};
};

const SessionEndContext = createContext<SessionEnd | null>(null);

export function SessionEndProvider({
	value,
	children,
}: {
	value: SessionEnd;
	children: ReactNode;
}) {
	return <SessionEndContext value={value}>{children}</SessionEndContext>;
}

/** The app's adapter: the session end on Convex, PostHog and the router. */
export function SessionEndData({
	path,
	sessionId,
	children,
}: {
	path: SessionPath;
	sessionId: Id<"sessions"> | null;
	children: ReactNode;
}) {
	const value = useSessionEndData({ path, sessionId });
	return <SessionEndProvider value={value}>{children}</SessionEndProvider>;
}

export function useSessionEnd(): SessionEnd {
	const value = use(SessionEndContext);
	if (!value) {
		throw new Error("useSessionEnd needs a SessionEndProvider above it");
	}
	return value;
}
