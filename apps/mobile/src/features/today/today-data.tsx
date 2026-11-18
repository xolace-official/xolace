import { createContext, type ReactNode, use } from "react";
import type { CampfireView } from "./campfire/campfire-model";
import type { KindlingView } from "./kindling/kindling-model";
import type { Door, TodayPhase } from "./today-model";
import { useTodayData } from "./use-today";

/**
 * Everything Today reads and does. Two adapters fill it: Convex and the device in the
 * app (`TodayData`) and fixtures in its dev states (`dev/`). Scroll, clocks and the hold
 * are screen state (`today-frame.ts`); only what is read, kept or navigated is here.
 */
export type Today = {
	state: {
		phase: TodayPhase;
		/** "Thursday · evening". */
		eyebrow: string;
		/** "Good evening, Ama"; no name while the profile loads or offline. */
		greeting: string;
		/** The day streak; null until it's known (loading, offline). */
		streak: {
			count: number;
			/** Grows once a day when the flame should ignite (the first thing that counted). */
			igniteKey: number;
		} | null;
		/** The first open of the day: the greeting's words, the rise, the word's ink. */
		intro: boolean;
		/** The Reflect card. */
		card: {
			/** This month's prompt, read or written about this week: it takes the card's question. */
			monthPrompt: string | null;
		};
		/**
		 * Your kindling: undefined while it loads, null with none (free, none yet, or the
		 * last one closed). S16 draws plus, free and setting up in the card's frame.
		 */
		kindling: KindlingView | null | undefined;
		/** This week's campers by the fire, or nothing without an honest number. */
		campfire: CampfireView | null;
		/** The local day ("YYYY-MM-DD"): a new day remounts the page, so its intro can play. */
		day: string;
	};
	actions: {
		/** The lifebuoy: Get help. */
		openHelp: () => void;
		/** The streak chip: where the streak lives (You). */
		openStreak: () => void;
		/** The Reflect card and the toolbar's pill. S2 zooms the card into Reflect. */
		openReflect: () => void;
		/** A door the hold opened: Talk, Vent or Sit with this. */
		openDoor: (door: Door) => void;
		/** The kindling card and its Begin. */
		openKindling: () => void;
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

/**
 * The app's adapter: Today on Convex, the device and the router.
 * @public The Today tab's route moves onto it in S1d, with the last modules; until then the
 * tab still hosts Discovery and Today opens from its dev states.
 */
export function TodayData({ children }: { children: ReactNode }) {
	const value = useTodayData();
	return <TodayProvider value={value}>{children}</TodayProvider>;
}
