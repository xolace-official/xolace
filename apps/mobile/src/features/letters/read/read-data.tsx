import { createContext, type ReactNode, use } from "react";
import type { ReceivedLetter, Undo } from "../letters-model";
import { useReader } from "./use-reader";

export type LetterReader = {
	state: {
		letter: ReceivedLetter | null | undefined;
		opens: { undo: Undo | null };
	};
	actions: {
		open: () => Promise<boolean>;
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
