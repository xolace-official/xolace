import type { TalkPace } from "@xolace/backend/convex/lib/voices";
import { createContext, type ReactNode, use } from "react";
import type { Directness } from "@/lib/talk/use-talk-style";
import type { WeekLeft } from "./talk-model";
import { useTalkSheetsData } from "./use-talk-sheets";

export type TalkSheets = {
	state: {
		name: string;
		pace: TalkPace;
		directness: Directness;
		week: WeekLeft;
	};
	actions: {
		setPace: (pace: TalkPace) => void;
		setDirectness: (directness: Directness) => void;
	};
};

const TalkSheetsContext = createContext<TalkSheets | null>(null);

export function TalkSheetsProvider({
	value,
	children,
}: {
	value: TalkSheets;
	children: ReactNode;
}) {
	return <TalkSheetsContext value={value}>{children}</TalkSheetsContext>;
}

export function useTalkSheets(): TalkSheets {
	const sheets = use(TalkSheetsContext);
	if (!sheets) {
		throw new Error("useTalkSheets needs a TalkSheetsProvider above it");
	}
	return sheets;
}

export function TalkSheetsData({ children }: { children: ReactNode }) {
	const value = useTalkSheetsData();
	return <TalkSheetsProvider value={value}>{children}</TalkSheetsProvider>;
}
