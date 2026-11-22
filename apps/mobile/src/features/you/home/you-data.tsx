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

export type FreezeBuy = {
	reason: string | null;
	sparks: number;
	price: number;
};

export type YouHome = {
	state: {
		hero: Hero | undefined;
		avatar: AvatarOption | null | undefined;
		streak: Streak | null | undefined;
		week: WeekDay[] | undefined;
		freeze: FreezeBuy | undefined;
		buying: boolean;
		badges: BadgesRow | undefined;
		days: IndexedHistory | null | undefined;
		chips: string[];
		patterns: PatternRow[];
		rank: RankCard | null | undefined;
		steadiness: SteadinessCard | undefined;
		intensity: IntensityWeek | null | undefined;
		plusRow: boolean;
		followUps: {
			items: FollowUpItem[] | undefined;
			loadingMore: boolean;
			waiting: number;
		};
	};
	actions: {
		openSettings: () => void;
		openAvatar: () => void;
		openBadges: () => void;
		buyFreeze: () => void;
		openPlus: () => void;
		checkIn: (card: FollowUpCard) => void;
		closeFollowUp: (card: FollowUpCard) => void;
		loadMoreFollowUps: () => void;
		openSteadiness: () => void;
		openEarlierWeeks: () => void;
		pageWeek: (by: -1 | 1) => void;
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
