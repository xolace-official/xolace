import { createContext, type ReactNode, use } from "react";
import type { ReceivedLetter } from "../letters-model";
import { useReader } from "./use-reader";

export type Undo = "ack" | "hide";

/**
 * Everything the reader reads and does. Two adapters fill it: the letters data module in the app
 * (`ReaderData`), fixtures in its dev states. Acknowledge and Hide reach it only after their 5 s
 * Undo, so an undone one never reaches the sender.
 */
export type LetterReader = {
	state: {
		/** Null once it's gone (reported), or for an id that isn't yours. */
		/** `undefined` while it loads; `null` once it's gone (reported, or not yours). */
		letter: ReceivedLetter | null | undefined;
		/** How the reader opens: mid-Undo (dev states). */
		opens: { undo: Undo | null };
	};
	actions: {
		/** Opening is what lets the next letter be placed. */
		open: () => void;
		acknowledge: () => void;
		hide: () => void;
		unhide: () => void;
	};
};

const ReaderContext = createContext<LetterReader | null>(null);

export function ReaderProvider({
	value,
	children,
}: {
	value: LetterReader;
	children: ReactNode;
}) {
	return <ReaderContext value={value}>{children}</ReaderContext>;
}

/** The app's adapter, for the letter in the route. */
export function ReaderData({
	id,
	children,
}: {
	id: string;
	children: ReactNode;
}) {
	return <ReaderProvider value={useReader(id)}>{children}</ReaderProvider>;
}

export function useReaderScreen(): LetterReader {
	const value = use(ReaderContext);
	if (!value) {
		throw new Error("useReaderScreen needs a ReaderProvider above it");
	}
	return value;
}
