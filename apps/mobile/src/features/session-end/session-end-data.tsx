import type { Doc, Id } from "@xolace/backend/convex/_generated/dataModel";
import { createContext, type ReactNode, use } from "react";
import type { IconName } from "@/components/shared/icon";
import type {
	LetterOffer,
	NextInput,
	NextKey,
	SavedMood,
	SessionFrom,
	SessionPath,
} from "./session-end-model";
import { useSessionEndData } from "./use-session-end";

/** The listener a matched suggestion opens (`ai.xolacers.suggest.sessionSuggestion`). */
export type ListenerCard = {
	/** Picks their art when there's no photo: the same person always wears the same pair. */
	id: string;
	name: string;
	/** "anxiety", "work stress": what they listen to, from their specialty. */
	listensTo: string;
	photoUrl?: string;
	/** Their average, once they have enough ratings to show one; absent: a new Xolacer. */
	rating?: number;
	/** In the app when the match was made. */
	present: boolean;
};

/** A part of life (`lib/validators` `domainValidator`). */
export type Domain = NonNullable<
	Doc<"sessions">["domainUnlock"]
>["domains"][number];

/**
 * Other features' pieces the slot's cards draw, composed in by the route (features meet in
 * routes): Connect's avatar for a listener, Steadiness's icon and name for a part of life.
 */
export type NextParts = {
	listenerAvatar: (listener: ListenerCard, size: number) => ReactNode;
	partIcon: (domain: Domain) => IconName;
	partName: (domain: Domain) => string;
};

/** What the slot's cards speak of, besides letters. */
export type NextCards = {
	listener: ListenerCard | null;
	/** The parts of life this session brought into focus (`sessions.domainUnlock`), held unseen. */
	unlock: readonly Domain[] | null;
	/** Free: the part of life that's been heavier than usual (`compounding.upsell.get`). */
	upsell: Domain | null;
};

/**
 * Letters' two cards, composed in by the route (features meet in routes): what letters may
 * offer, their tile, and what showing, passing and taking them does to letters' memory.
 */
export type EndLetters = {
	/** Given this session's safeguard; undefined while letters load. */
	offer: (safeguard: boolean) => LetterOffer | undefined;
	/** The folded letter with its ember seal, on the ember wash: both cards' tile. */
	tile: ReactNode;
	/** The write card showed: it rests a week. */
	writeShown: () => void;
	/** Left without taking it: the third pass running rests it 30 days. */
	writePassed: () => void;
	/** The waiting-letter card was kept: it opens that letter all visit, even once it's opened. */
	readShown: () => void;
	/** The waiting letter, in the reader; the Letters screen if it's gone. */
	openRead: () => void;
	/** Taken: its passes start over, and the writing screen opens. */
	openWrite: () => void;
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
		/** The listener, the part of life in focus, the heavier part: the slot's cards' words. */
		cards: NextCards;
		/** Letters' tile for its two cards. */
		letterTile: ReactNode;
		/** Connect's and Steadiness's pieces for the other cards. */
		parts: NextParts;
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
	letters,
	parts,
	children,
}: {
	path: SessionPath;
	sessionId: Id<"sessions"> | null;
	letters: EndLetters;
	parts: NextParts;
	children: ReactNode;
}) {
	const value = useSessionEndData({ letters, parts, path, sessionId });
	return <SessionEndProvider value={value}>{children}</SessionEndProvider>;
}

export function useSessionEnd(): SessionEnd {
	const value = use(SessionEndContext);
	if (!value) {
		throw new Error("useSessionEnd needs a SessionEndProvider above it");
	}
	return value;
}
