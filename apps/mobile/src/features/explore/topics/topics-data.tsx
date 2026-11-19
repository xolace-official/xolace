import { createContext, type ReactNode, use } from "react";
import type { TopicTile } from "@/features/explore/explore-model";
import { useTopics } from "@/features/explore/topics/use-topics";

/** Topics: every published topic's tile. Convex in the app, fixtures in its dev states. */
export type Topics = {
	state: {
		/** undefined while it loads. */
		topics: readonly TopicTile[] | undefined;
	};
	actions: Record<string, never>;
};

const TopicsContext = createContext<Topics | null>(null);

export function TopicsProvider({
	value,
	children,
}: {
	value: Topics;
	children: ReactNode;
}) {
	return <TopicsContext value={value}>{children}</TopicsContext>;
}

/** The app's adapter: `browse/topics.getTopics`. */
export function TopicsData({ children }: { children: ReactNode }) {
	return <TopicsProvider value={useTopics()}>{children}</TopicsProvider>;
}

export function useTopicsScreen(): Topics {
	const value = use(TopicsContext);
	if (!value) {
		throw new Error("useTopicsScreen needs a TopicsProvider above it");
	}
	return value;
}
