/**
 * Explore's doors on fixtures, each under its own provider through the same `{ state, actions }`
 * as the app. A row's tap plays and pauses it on screen (no sound), so the playing mark can be
 * seen; a free listener's tap does nothing (the app opens Xolace+).
 */
import { useState } from "react";
import type { Family } from "@/features/explore/copy";
import {
	type Slug,
	topicHeader,
	topicTracks,
} from "@/features/explore/dev/fixtures";
import type {
	ExploreTrack,
	Listen,
	TopicTile,
} from "@/features/explore/explore-model";
import { FamilyListProvider } from "@/features/explore/list/family-list-data";
import { FamilyListScreen } from "@/features/explore/list/family-list-screen";
import { TopicProvider } from "@/features/explore/topic/topic-data";
import { TopicScreen } from "@/features/explore/topic/topic-screen";
import { TopicsProvider } from "@/features/explore/topics/topics-data";
import { TopicsScreen } from "@/features/explore/topics/topics-screen";

const NO_ACTIONS = {};

/** Plays on screen: a tap loads a track, a second tap pauses it. */
function useFixtureListen(locked: boolean, start?: string): Listen {
	const [nowPlaying, setNowPlaying] = useState<string | null>(start ?? null);
	const [playing, setPlaying] = useState(start !== undefined);
	const open: Listen["open"] = (t) => {
		if (locked) {
			return;
		}
		if (t.slug === nowPlaying) {
			setPlaying((p) => !p);
			return;
		}
		setNowPlaying(t.slug);
		setPlaying(true);
	};
	return { locked, nowPlaying, open, playing };
}

export function FixtureTopics({
	topics,
}: {
	topics: readonly TopicTile[] | undefined;
}) {
	return (
		<TopicsProvider value={{ actions: NO_ACTIONS, state: { topics } }}>
			<TopicsScreen />
		</TopicsProvider>
	);
}

export function FixtureList({
	first,
	lists,
	loadingMore = false,
	locked = false,
}: {
	first: Family;
	lists: Record<Family, readonly ExploreTrack[]> | undefined;
	loadingMore?: boolean;
	locked?: boolean;
}) {
	const [family, setFamily] = useState(first);
	const listen = useFixtureListen(locked);
	return (
		<FamilyListProvider
			value={{
				actions: { loadMore: undefined, pick: setFamily },
				state: { family, listen, loadingMore, tracks: lists?.[family] },
			}}
		>
			<FamilyListScreen />
		</FamilyListProvider>
	);
}

/** `slug` null: a topic that isn't there; undefined: still loading. */
export function FixtureTopic({
	slug,
	family,
	locked = false,
	playing,
}: {
	slug: Slug | null | undefined;
	family?: Family;
	locked?: boolean;
	/** A track's slug already in the mini player, playing. */
	playing?: string;
}) {
	const listen = useFixtureListen(locked, playing);
	return (
		<TopicProvider
			value={{
				actions: NO_ACTIONS,
				state: {
					family,
					header: slug ? topicHeader(slug) : slug,
					listen,
					tracks: slug ? topicTracks(slug) : undefined,
				},
			}}
		>
			<TopicScreen />
		</TopicProvider>
	);
}
