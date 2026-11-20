import { createContext, type ReactNode, use } from "react";
import type { LetterFor } from "../copy";
import type { Draft, SendAnswer, WriteLimit } from "../letters-model";
import { useWrite } from "./use-write";

export type WriteOpens = {
	stage: "edit" | "wait" | "sent" | "rest";
	line: string | null;
	care: boolean;
	focus: boolean;
	reduced: boolean | null;
};

export type LettersWrite = {
	state: {
		checking: boolean;
		text: string;
		forWho: LetterFor;
		held: string;
		late: SendAnswer | null;
		limit: WriteLimit | null | undefined;
		opens: WriteOpens;
	};
	actions: {
		setText: (text: string) => void;
		setForWho: (forWho: LetterFor) => void;
		send: (draft: Draft) => Promise<SendAnswer | null>;
		played: () => void;
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
