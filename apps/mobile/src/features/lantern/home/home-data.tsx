import type { api } from "@xolace/backend/api";
import type { FunctionReturnType } from "convex/server";
import { createContext, type ReactNode, use } from "react";
import { useHome } from "@/features/lantern/home/use-home";
import type { Subject } from "@/features/lantern/lantern-model";
import type { EntryActions } from "@/features/lantern/use-entry-actions";

export type HomeView = FunctionReturnType<typeof api.library.home.getHome>;

/**
 * Lantern's home: Continue, Reading as…, For you, Hubs, the kinds and A–Z. Convex in the app
 * (`HomeData`), fixtures in its dev states.
 */
export type Home = {
	state: {
		/** undefined while it loads. */
		home: HomeView | undefined;
		/** For A–Z's letters; undefined while it loads. */
		subjects: readonly Subject[] | undefined;
		/** Moves on each time the welcome closes, so the sections rise in again. */
		arrival: number;
	};
	actions: Pick<EntryActions, "share"> & {
		/** Reading as…: Done with these picks, or Skip (an empty list is an answer too). */
		answerReadingAs: (audiences: readonly string[]) => void;
		/** The bar's Reading as menu: one audience on or off. */
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

/** The app's adapter: the home on Convex, PostHog and the toast. */
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
