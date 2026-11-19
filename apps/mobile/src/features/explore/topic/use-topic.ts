import { api } from "@xolace/backend/api";
import { useQuery } from "convex/react";
import { useLocalSearchParams } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useEffect } from "react";
import type { Topic } from "@/features/explore/topic/topic-data";
import { useListen } from "@/features/explore/use-listen";
import type { BrowseFrom } from "@/lib/now-playing/now-playing-store";

type Params = { slug: string; family?: string; from?: string };

/** Where a topic's plays come from: a twig's "More like this" tags its own, else "topic". */
const fromOf = (param: string | undefined): BrowseFrom =>
	param === "twig-more-like-this" ? param : "topic";

const NO_ACTIONS = {};

/** A topic's data: the cover (`getTopicHeader`), the rows (`getTopic`), production's event. */
export function useTopic(): Topic {
	const { slug, family, from } = useLocalSearchParams<Params>();
	const posthog = usePostHog();
	const header = useQuery(api.browse.topics.getTopicHeader, { slug });
	const tracks = useQuery(api.browse.topics.getTopic, { slug });
	const listen = useListen(fromOf(from));

	useEffect(() => {
		posthog.capture("browse_topic_opened", { topic: slug });
	}, [posthog, slug]);

	return { actions: NO_ACTIONS, state: { family, header, listen, tracks } };
}
