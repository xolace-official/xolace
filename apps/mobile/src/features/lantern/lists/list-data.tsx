import { createContext, type ReactNode, use } from "react";
import type { ReaderFrom } from "@/features/lantern/lantern-links";
import type { CardItem } from "@/features/lantern/lantern-model";
import {
	type ListOf,
	useEntryList,
} from "@/features/lantern/lists/use-entry-list";
import type { EntryActions } from "@/features/lantern/use-entry-actions";

export type EntryList = {
	state: {
		title: string;
		from: ReaderFrom;
		items: readonly CardItem[] | undefined;
		empty: string;
		canLoadMore: boolean;
		loadingMore: boolean;
	};
	actions: EntryActions & { loadMore: () => void };
};

const ListContext = createContext<EntryList | null>(null);

export function ListProvider({
	value,
	children,
}: {
	value: EntryList;
	children: ReactNode;
}) {
	return <ListContext value={value}>{children}</ListContext>;
}

export function ListData({
	of,
	children,
}: {
	of: ListOf;
	children: ReactNode;
}) {
	return <ListProvider value={useEntryList(of)}>{children}</ListProvider>;
}

export function useList(): EntryList {
	const value = use(ListContext);
	if (!value) {
		throw new Error("useList needs a ListProvider above it");
	}
	return value;
}
