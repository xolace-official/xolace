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

export type ListenerCard = {
	id: string;
	name: string;
	listensTo: string;
	photoUrl?: string;
	rating?: number;
	present: boolean;
};

export type Domain = NonNullable<
	Doc<"sessions">["domainUnlock"]
>["domains"][number];

export type NextParts = {
	listenerAvatar: (listener: ListenerCard, size: number) => ReactNode;
	partIcon: (domain: Domain) => IconName;
	partName: (domain: Domain) => string;
};

export type NextCards = {
	listener: ListenerCard | null;
	unlock: readonly Domain[] | null;
	upsell: Domain | null;
};

export type EndLetters = {
	offer: (safeguard: boolean) => LetterOffer | undefined;
	tile: ReactNode;
	writeShown: () => void;
	writePassed: () => void;
	readShown: () => void;
	openRead: () => void;
	openWrite: () => void;
};

export type SessionEnd = {
	state: {
		ready: boolean;
		late: boolean;
		from: SessionFrom | null;
		words: string | null;
		day: { from: number; to: number } | null;
		slot: Omit<NextInput, "late" | "step">;
		cards: NextCards;
		letterTile: ReactNode;
		parts: NextParts;
		canAskFollowUp: boolean;
	};
	actions: {
		saveMood: (mood: SavedMood) => void;
		askFollowUp: (
			step: number,
			onClosed: (answer: string | null) => void
		) => void;
		share: (contributed: boolean) => void;
		nextShown: (key: NextKey) => void;
		openNext: (key: NextKey) => void;
		done: () => void;
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
