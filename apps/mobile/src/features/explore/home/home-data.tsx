import { createContext, type ReactNode, use } from "react";
import type { DoorId } from "@/features/explore/copy";
import type {
	ContinueCard,
	ForYou,
	HomeItem,
	HomeTrack,
	Playable,
	ShelfTrack,
	ShortItem,
} from "@/features/explore/home/home-model";
import { useExploreHome } from "@/features/explore/home/use-explore-home";
import type { DayPhase } from "@/lib/day-phase";
import type { BrowseFrom } from "@/lib/now-playing/now-playing-store";

export type HomeFrom = Extract<BrowseFrom, `explore-${string}`> | "hub-new";

export type HomeState = {
	cont: ContinueCard[] | undefined;
	featured: ShelfTrack | null | undefined;
	hour: HomeTrack[] | undefined;
	phase: DayPhase;
	forYou: ForYou | null | undefined;
	fresh: ShelfTrack[] | undefined;
	short: ShortItem[] | undefined;
	locked: boolean;
	nowPlaying: string | null;
	playing: boolean;
	canPreview: boolean;
	hearing: string | null;
	startPicked?: boolean;
};

export type HomeActions = {
	open: (it: HomeItem, from: HomeFrom) => void;
	resume: (c: ContinueCard) => void;
	playHere: (t: Playable, from: HomeFrom, at?: number) => void;
	removeContinue: (c: ContinueCard) => void;
	stopUsingSessions: () => void;
	door: (id: DoorId) => void;
	hearStart: (key: string, slug: string) => void;
	hearEnd: (key: string) => void;
};

export type Home = { state: HomeState; actions: HomeActions };

const HomeContext = createContext<Home | null>(null);

export function useHome(): Home {
	const home = use(HomeContext);
	if (!home) {
		throw new Error("useHome needs a HomeProvider");
	}
	return home;
}

export function HomeProvider({
	value,
	children,
}: {
	value: Home;
	children: ReactNode;
}) {
	return <HomeContext value={value}>{children}</HomeContext>;
}

export function HomeData({ children }: { children: ReactNode }) {
	return <HomeProvider value={useExploreHome()}>{children}</HomeProvider>;
}
