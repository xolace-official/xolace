import { createContext, type ReactNode, use } from "react";
import type { AvatarOption } from "@/features/you/avatar-model";
import type { IndexedHistory, WeekDay } from "@/features/you/home/days-model";
import type {
	FollowUpCard,
	FollowUpItem,
} from "@/features/you/home/follow-ups-model";
import type { SteadinessCard } from "@/features/you/home/steadiness/steadiness-model";
import { useYou } from "@/features/you/home/use-you";
import type { IntensityWeek } from "@/features/you/home/use-you-week";
import type {
	BadgesRow,
	Hero,
	PatternRow,
	RankCard,
	Streak,
} from "@/features/you/home/you-model";

/** The freeze explanation's buy: production's refusal reasons, and the sparks to spend. */
export type FreezeBuy = {
	/** Why buying is off, or null when it's on. */
	reason: string | null;
	sparks: number;
	price: number;
};

/**
 * Everything the You tab reads and does. Two adapters fill it: Convex in the app (`YouData`)
 * and fixtures in its dev states (`dev/`). No part calls a data hook, so a dev state is the
 * whole tab and a tap in one never reaches the backend. Undefined means still loading.
 */
export type YouHome = {
	state: {
		hero: Hero | undefined;
		avatar: AvatarOption | null | undefined;
		/** Null: nothing to show yet (no moments and no freezes). */
		streak: Streak | null | undefined;
		week: WeekDay[] | undefined;
		freeze: FreezeBuy | undefined;
		buying: boolean;
		badges: BadgesRow | undefined;
		/** Your days; null when it's hidden in Settings. */
		days: IndexedHistory | null | undefined;
		chips: string[];
		patterns: PatternRow[];
		/** Among the fires; null when hidden. */
		rank: RankCard | null | undefined;
		steadiness: SteadinessCard | undefined;
		/** This week; null when hidden, or before the first moment. */
		intensity: IntensityWeek | null | undefined;
		/** Free users get the one Xolace+ row at the end. */
		plusRow: boolean;
		followUps: {
			items: FollowUpItem[] | undefined;
			loadingMore: boolean;
			/** Cards waiting on an answer: the tab's badge. */
			waiting: number;
		};
	};
	actions: {
		openSettings: () => void;
		openAvatar: () => void;
		openBadges: () => void;
		buyFreeze: () => void;
		openPlus: () => void;
		/** Open a waiting card's check-in. */
		checkIn: (card: FollowUpCard) => void;
		/** Close a card no check-in is coming for. */
		closeFollowUp: (card: FollowUpCard) => void;
		loadMoreFollowUps: () => void;
		openSteadiness: () => void;
		/** Free users: the earlier-weeks gate (the paywall). */
		openEarlierWeeks: () => void;
		pageWeek: (by: -1 | 1) => void;
		/** This week came into view (production's teaser analytics). */
		weekSeen: () => void;
	};
};

const YouContext = createContext<YouHome | null>(null);

export function YouProvider({
	value,
	children,
}: {
	value: YouHome;
	children: ReactNode;
}) {
	return <YouContext value={value}>{children}</YouContext>;
}

/** The app's adapter: the tab on Convex. */
export function YouData({ children }: { children: ReactNode }) {
	return <YouProvider value={useYou()}>{children}</YouProvider>;
}

export function useYouHome(): YouHome {
	const value = use(YouContext);
	if (!value) {
		throw new Error("useYouHome needs a YouProvider above it");
	}
	return value;
}
