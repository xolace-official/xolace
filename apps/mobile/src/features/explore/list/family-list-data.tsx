import { createContext, type ReactNode, use } from "react";
import type { Family } from "@/features/explore/copy";
import type { ExploreTrack, Listen } from "@/features/explore/explore-model";
import { useFamilyList } from "@/features/explore/list/use-family-list";

/** Support audio or Music: production's one list per kind, a page at a time. */
export type FamilyList = {
	state: {
		family: Family;
		/** undefined while the first page loads. */
		tracks: readonly ExploreTrack[] | undefined;
		/** A later page is on its way. */
		loadingMore: boolean;
		listen: Listen;
	};
	actions: {
		/** The Family menu: the other kind, in place. */
		pick: (family: Family) => void;
		/** The end of the list came near; undefined once every page is in. */
		loadMore: (() => void) | undefined;
	};
};

const FamilyListContext = createContext<FamilyList | null>(null);

export function FamilyListProvider({
	value,
	children,
}: {
	value: FamilyList;
	children: ReactNode;
}) {
	return <FamilyListContext value={value}>{children}</FamilyListContext>;
}

/** The app's adapter: `browse/family.listByFamily`, `?family=` picking the first kind. */
export function FamilyListData({ children }: { children: ReactNode }) {
	return (
		<FamilyListProvider value={useFamilyList()}>{children}</FamilyListProvider>
	);
}

export function useFamilyListScreen(): FamilyList {
	const value = use(FamilyListContext);
	if (!value) {
		throw new Error("useFamilyListScreen needs a FamilyListProvider above it");
	}
	return value;
}
