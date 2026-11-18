import { createContext, type ReactNode, use } from "react";
import type { ListItem } from "@/features/you/moments/moments-model";
import { useMoments } from "@/features/you/moments/use-moments";

/**
 * Everything the Moments list reads and does. Convex fills it in the app (`MomentsData`),
 * fixtures in its dev states. Undefined state means the first page is still loading.
 */
export type MomentsScreenData = {
	state:
		| {
				/** Newest first, a day's label before each run of that day. Empty: no moments yet. */
				items: ListItem[];
				canLoadMore: boolean;
				loadingMore: boolean;
				/** Free, the list ran out and older moments are hidden: the window's length in days,
				 * from the server. Null: no door. */
				windowDays: number | null;
		  }
		| undefined;
	actions: {
		loadMore: () => void;
		/** The door: the paywall at the timeline's own source. */
		seeAll: () => void;
		/** The door came on screen. */
		doorSeen: () => void;
	};
};

const Context = createContext<MomentsScreenData | null>(null);

export function MomentsProvider({
	value,
	children,
}: {
	value: MomentsScreenData;
	children: ReactNode;
}) {
	return <Context value={value}>{children}</Context>;
}

export function MomentsData({ children }: { children: ReactNode }) {
	return <MomentsProvider value={useMoments()}>{children}</MomentsProvider>;
}

export function useMomentsScreen(): MomentsScreenData {
	const value = use(Context);
	if (!value) {
		throw new Error("useMomentsScreen outside MomentsData");
	}
	return value;
}
