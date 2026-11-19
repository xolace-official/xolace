import { api } from "@xolace/backend/api";
import { useQuery } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { useEffect } from "react";
import { topicsInOrder } from "@/features/explore/explore-model";
import type { Topics } from "@/features/explore/topics/topics-data";

const NO_ACTIONS = {};

/** Topics' data: the grid, alphabetical, and production's open event. */
export function useTopics(): Topics {
	const posthog = usePostHog();
	const topics = useQuery(api.browse.topics.getTopics, {});

	useEffect(() => {
		posthog.capture("browse_topics_opened");
	}, [posthog]);

	return {
		actions: NO_ACTIONS,
		state: { topics: topics === undefined ? undefined : topicsInOrder(topics) },
	};
}
