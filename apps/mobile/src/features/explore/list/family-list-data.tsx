import { createContext, type ReactNode, use } from "react";
import type { Family } from "@/features/explore/copy";
import type { ExploreTrack, Listen } from "@/features/explore/explore-model";
import { useFamilyList } from "@/features/explore/list/use-family-list";

export type FamilyList = {
	state: {
		family: Family;
		tracks: readonly ExploreTrack[] | undefined;
		loadingMore: boolean;
		listen: Listen;
	};
	actions: {
		pick: (family: Family) => void;
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
