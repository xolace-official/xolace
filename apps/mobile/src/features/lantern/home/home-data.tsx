import type { api } from "@xolace/backend/api";
import type { FunctionReturnType } from "convex/server";
import { createContext, type ReactNode, use } from "react";
import { useHome } from "@/features/lantern/home/use-home";
import type { Subject } from "@/features/lantern/lantern-model";
import type { EntryActions } from "@/features/lantern/use-entry-actions";

export type HomeView = FunctionReturnType<typeof api.library.home.getHome>;

export type Home = {
	state: {
		home: HomeView | undefined;
		subjects: readonly Subject[] | undefined;
		arrival: number;
	};
	actions: Pick<EntryActions, "share"> & {
		answerReadingAs: (audiences: readonly string[]) => void;
		flipAudience: (slug: string) => void;
	};
};

const HomeContext = createContext<Home | null>(null);

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
	return <HomeProvider value={useHome()}>{children}</HomeProvider>;
}

export function useHomeScreen(): Home {
	const value = use(HomeContext);
	if (!value) {
		throw new Error("useHomeScreen needs a HomeProvider above it");
	}
	return value;
}
