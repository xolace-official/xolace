import { createContext, type ReactNode, use } from "react";
import type {
	ExploreTrack,
	Listen,
	TopicHeader,
} from "@/features/explore/explore-model";
import { useTopic } from "@/features/explore/topic/use-topic";

export type Topic = {
	state: {
		header: TopicHeader | null | undefined;
		tracks: readonly ExploreTrack[] | undefined;
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
