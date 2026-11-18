import type { Href } from "expo-router";
import { createContext, type ReactNode, use } from "react";
import type { CampfireView } from "./campfire/campfire-model";
import type { KindlingView } from "./kindling/kindling-model";
import type { MomentView } from "./moments/moments-model";
import type { RailTile } from "./rail/rail-model";
import type { CardMode, Door, TodayPhase } from "./today-model";
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
		/**
		 * A streak that broke yesterday and one saver can bring back, until the day ends; null
		 * with none on offer. `busy` while the revive is on its way.
		 */
		rekindle: { streak: number; busy: boolean } | null;
		/** The first open of the day: the greeting's words, the rise, the word's ink. */
		intro: boolean;
		/**
		 * What shows above the fold is in (`todayReady`): the launch cover may leave onto it.
		 * Fixtures are always ready.
		 */
		ready: boolean;
		/** The Reflect card. */
		card: {
			/** This month's prompt, read or written about this week: it takes the card's question. */
			monthPrompt: string | null;
			/** Your open session: the field, your words with the mirror, or the mirror back. */
			mode: CardMode;
			/** Where the card and the toolbar's pill zoom to: Reflect (a dev state's, on fixtures). */
			reflect: Href;
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
		/** Something to listen to (the hub's New shelf); undefined while it loads. */
		rail: RailTile[] | undefined;
		/** The track playing now, so its tile shows the meter. */
		playingSlug: string | null;
		/** A free member: tracks open Xolace+, so tiles show the lock. */
		listenLocked: boolean;
		/** Your latest moments (the timeline's first page); undefined while it loads. */
		moments: MomentView[] | undefined;
		/** Today's quote; null with none, undefined while it loads. */
		word: string | null | undefined;
	};
	actions: {
		/** The lifebuoy: Get help. */
		openHelp: () => void;
		/** The streak chip: where the streak lives (You). */
		openStreak: () => void;
		/** Spend one streak saver on the streak on offer. */
		rekindle: () => void;
		/** A tap on the Reflect card or the toolbar's pill: the press. Their link zooms into Reflect. */
		pressReflect: () => void;
		/** A door the hold opened: Talk, Vent or Sit with this. */
		openDoor: (door: Door) => void;
		/** The kindling card and its Begin. */
		openKindling: () => void;
		/** A rail tile or the quiet row: the player for Plus, the paywall for free. */
		openTrack: (tile: RailTile) => void;
		/** The rail's See all. */
		openExplore: () => void;
		openMoment: (id: string) => void;
		openMoments: () => void;
		/** The word, into Quotes. */
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

/** The app's adapter: Today on Convex, the device and the router (the Today tab's route). */
export function TodayData({ children }: { children: ReactNode }) {
	const value = useTodayData();
	return <TodayProvider value={value}>{children}</TodayProvider>;
}
