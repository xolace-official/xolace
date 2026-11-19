import { createContext, type ReactNode, use } from "react";
import type {
	ExploreTrack,
	Listen,
	TopicHeader,
} from "@/features/explore/explore-model";
import { useTopic } from "@/features/explore/topic/use-topic";

/** A topic: its cover and count line, and both kinds' tracks. */
export type Topic = {
	state: {
		/** undefined while it loads; null for an unknown or unpublished slug. */
		header: TopicHeader | null | undefined;
		/** undefined while it loads. */
		tracks: readonly ExploreTrack[] | undefined;
		/** `?family=`: the chip to start on, when the topic has chips. */
		family: string | undefined;
		listen: Listen;
	};
	actions: Record<string, never>;
};

const TopicContext = createContext<Topic | null>(null);

export function TopicProvider({
	value,
	children,
}: {
	value: Topic;
	children: ReactNode;
}) {
	return <TopicContext value={value}>{children}</TopicContext>;
}

/** The app's adapter: `browse/topics.getTopicHeader` and `getTopic` for the route's slug. */
export function TopicData({ children }: { children: ReactNode }) {
	return <TopicProvider value={useTopic()}>{children}</TopicProvider>;
}

export function useTopicScreen(): Topic {
	const value = use(TopicContext);
	if (!value) {
		throw new Error("useTopicScreen needs a TopicProvider above it");
	}
	return value;
}
