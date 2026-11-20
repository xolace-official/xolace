import { api } from "@xolace/backend/api";
import { type ConvexReactClient, useConvex, useQuery } from "convex/react";
import { useLocalSearchParams } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useEffect } from "react";
import type { TopicHeader } from "@/features/explore/explore-model";
import type { Topic } from "@/features/explore/topic/topic-data";
import { useListen } from "@/features/explore/use-listen";
import type { BrowseFrom } from "@/lib/now-playing/now-playing-store";

type Params = { slug: string; family?: string; from?: string };

const fromOf = (param: string | undefined): BrowseFrom =>
	param === "twig-more-like-this" ? param : "topic";

const NO_ACTIONS = {};

export function useTopic(): Topic {
	const { slug, family, from } = useLocalSearchParams<Params>();
	const posthog = usePostHog();
	const convex = useConvex();
	const header = useQuery(api.browse.topics.getTopicHeader, { slug });
	const tracks = useQuery(api.browse.topics.getTopic, { slug });
	const listen = useListen(fromOf(from));

	useEffect(() => {
		posthog.capture("browse_topic_opened", { topic: slug });
	}, [posthog, slug]);

	return {
		actions: NO_ACTIONS,
		state: {
			family,
			header: header === undefined ? gridTile(convex, slug) : header,
			listen,
			tracks,
		},
	};
}

/**
 * The tile the grid already holds for this topic, if `getTopics` is in the client's cache (a
 * tile was tapped): same shape as the header, so the cover zooms in drawn, not blank, while
 * `getTopicHeader` loads. A watch with no `onUpdate` reads the cache without subscribing.
 */
function gridTile(
	convex: ConvexReactClient,
	slug: string
): TopicHeader | undefined {
	try {
		const tile = convex
			.watchQuery(api.browse.topics.getTopics, {})
			.localQueryResult()
			?.find((t) => t.slug === slug);
		return tile && { ...tile, thumbhash: tile.thumbhash };
	} catch {
		return undefined;
	}
}
