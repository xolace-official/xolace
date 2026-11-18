import { createContext, type ReactNode, use } from "react";
import type { ReaderFrom } from "@/features/lantern/lantern-links";
import type { CardItem } from "@/features/lantern/lantern-model";
import {
	type ListOf,
	useEntryList,
} from "@/features/lantern/lists/use-entry-list";
import type { EntryActions } from "@/features/lantern/use-entry-actions";

/**
 * A kind, a subject or Saved: everything the list screen reads and does. Two adapters fill it:
 * Convex in the app (`ListData`) and fixtures in the dev states. No row calls Convex itself.
 */
export type EntryList = {
	state: {
		title: string;
		/** Where an open came from, for the reader's analytics. */
		from: ReaderFrom;
		/** undefined while it loads. */
		items: readonly CardItem[] | undefined;
		empty: string;
		/** Saved pages; the others load at once. */
		canLoadMore: boolean;
		/** A further page is on its way. */
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

/** The app's adapter: the list on Convex. */
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
