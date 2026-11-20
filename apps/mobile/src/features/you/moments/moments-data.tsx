import { createContext, type ReactNode, use } from "react";
import type { ListItem } from "@/features/you/moments/moments-model";
import { useMoments } from "@/features/you/moments/use-moments";

export type MomentsScreenData = {
	state:
		| {
				items: ListItem[];
				canLoadMore: boolean;
				loadingMore: boolean;
				windowDays: number | null;
		  }
		| undefined;
	actions: {
		loadMore: () => void;
		seeAll: () => void;
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
