import { createContext, type ReactNode, use } from "react";
import type { LetterFor } from "../copy";
import type { Draft, SendAnswer, WriteLimit } from "../letters-model";
import { useWrite } from "./use-write";

/** Where the writing screen is: writing, the check running, what it answered. */
export type WriteStage = "edit" | "wait" | "rise" | "sent" | "back" | "rest";

/** How the screen opens. The app always opens it writing; dev states open it mid-way. */
export type WriteOpens = {
	stage: "edit" | "wait" | "sent" | "rest";
	/** The check's line, already showing. */
	line: string | null;
	care: boolean;
	/** The field takes focus (keyboard up). */
	focus: boolean;
	/** Overrides the reduced-motion setting (dev states only). */
	reduced: boolean | null;
};

/**
 * Everything the writing screen reads and does. Two adapters fill it: the letters data module
 * and the device's draft in the app (`WriteData`), fixtures in its dev states.
 */
export type LettersWrite = {
	state: {
		text: string;
		forWho: LetterFor;
		/** A held letter's words: Send stays off until they change. */
		held: string;
		/**
		 * Why Write is off, if it is (the server's caps). `undefined` while the status loads:
		 * Send stays off and no limit shows.
		 */
		limit: WriteLimit | null | undefined;
		opens: WriteOpens;
	};
	actions: {
		setText: (text: string) => void;
		setForWho: (forWho: LetterFor) => void;
		/** The check reads it; a pass clears the draft, a held letter keeps its words. */
		send: (draft: Draft) => Promise<SendAnswer>;
	};
};

const WriteContext = createContext<LettersWrite | null>(null);

export function WriteProvider({
	value,
	children,
}: {
	value: LettersWrite;
	children: ReactNode;
}) {
	return <WriteContext value={value}>{children}</WriteContext>;
}

/** The app's adapter. */
export function WriteData({ children }: { children: ReactNode }) {
	return <WriteProvider value={useWrite()}>{children}</WriteProvider>;
}

export function useWriteScreen(): LettersWrite {
	const value = use(WriteContext);
	if (!value) {
		throw new Error("useWriteScreen needs a WriteProvider above it");
	}
	return value;
}
