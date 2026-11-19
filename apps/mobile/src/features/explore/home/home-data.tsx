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

/** Where a home item was opened from, for `browse_track_opened` and the reader's `from`. */
export type HomeFrom = Extract<BrowseFrom, `explore-${string}`> | "hub-new";

/** Explore home's data: each shelf `undefined` while it loads. */
export type HomeState = {
	cont: ContinueCard[] | undefined;
	featured: ShelfTrack | null | undefined;
	hour: HomeTrack[] | undefined;
	phase: DayPhase;
	/** Null: a new member, nothing matched, or "Don't use my sessions here". */
	forYou: ForYou | null | undefined;
	fresh: ShelfTrack[] | undefined;
	short: ShortItem[] | undefined;
	/** A free listener: tracks open Xolace+. */
	locked: boolean;
	/** The slug in the mini player, and whether it plays. */
	nowPlaying: string | null;
	playing: boolean;
	/**
	 * Hold to hear (handoff §13): Xolace+ only, through the now-playing track. A free listener has
	 * no preview to hear yet (that needs a free preview clip from the backend), so the hold does
	 * nothing for them and a tap opens Xolace+.
	 */
	canPreview: boolean;
	/** The cover being heard, as `${section}:${id}`. */
	hearing: string | null;
	/** Dev states: Choose for me already open. */
	startPicked?: boolean;
};

export type HomeActions = {
	/** A row, a tile, Choose for me: an entry opens the reader, a track the player (or Xolace+). */
	open: (it: HomeItem, from: HomeFrom) => void;
	/** A Continue card: a track plays from its place and the player opens; an entry reopens. */
	resume: (c: ContinueCard) => void;
	/** A ring or Featured's play: plays or pauses in place; locked, Xolace+. */
	playHere: (t: Playable, from: HomeFrom, at?: number) => void;
	removeContinue: (c: ContinueCard) => void;
	stopUsingSessions: () => void;
	door: (id: DoorId) => void;
	/** `key` is the cover held, `slug` its track. */
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

/** The app's Explore home: Convex, PostHog and the player. */
export function HomeData({ children }: { children: ReactNode }) {
	return <HomeProvider value={useExploreHome()}>{children}</HomeProvider>;
}
