import type { Href } from "expo-router";
import { createContext, type ReactNode, use } from "react";
import type { CampfireView } from "./campfire/campfire-model";
import type { FindingAnswer } from "./finding/finding-model";
import type { KindlingEmptyMode } from "./kindling/card-mode";
import type { KindlingView } from "./kindling/kindling-model";
import type { MomentView } from "./moments/moments-model";
import type { RailTile } from "./rail/rail-model";
import type { CardMode, Door, TodayPhase } from "./today-model";
import { useTodayData } from "./use-today";

export type Today = {
	state: {
		phase: TodayPhase;
		eyebrow: string;
		greeting: string;
		streak: {
			count: number;
			igniteKey: number;
		} | null;
		rekindle: { streak: number; busy: boolean } | null;
		intro: boolean;
		ready: boolean;
		card: {
			monthPrompt: string | null;
			mode: CardMode;
			reflect: Href;
		};
		kindling: KindlingView | null | undefined;
		kindlingEmpty: KindlingEmptyMode | undefined;
		campfire: CampfireView | null;
		findingDue: boolean;
		day: string;
		rail: RailTile[] | undefined;
		playingSlug: string | null;
		listenLocked: boolean;
		moments: MomentView[] | undefined;
		word: string | null | undefined;
	};
	actions: {
		openHelp: () => void;
		openStreak: () => void;
		rekindle: () => void;
		pressReflect: () => void;
		answerFinding: (answer: FindingAnswer) => void;
		dismissFinding: () => void;
		openDoor: (door: Door) => void;
		openKindling: () => void;
		talkForKindling: () => void;
		seeKindlingPlus: () => void;
		openTrack: (tile: RailTile) => void;
		openExplore: () => void;
		openMoment: (id: string) => void;
		openMoments: () => void;
		openQuotes: () => void;
	};
};

const TodayContext = createContext<Today | null>(null);

export function TodayProvider({
	value,
	children,
}: {
	value: Today;
	children: ReactNode;
}) {
	return <TodayContext value={value}>{children}</TodayContext>;
}

export function useToday(): Today {
	const today = use(TodayContext);
	if (!today) {
		throw new Error("useToday needs a TodayProvider above it");
	}
	return today;
}

export function TodayData({ children }: { children: ReactNode }) {
	const value = useTodayData();
	return <TodayProvider value={value}>{children}</TodayProvider>;
}
