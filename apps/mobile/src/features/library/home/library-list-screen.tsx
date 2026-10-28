/**
 * The one Lantern list (#393 routes): a hub in the editor's order (cover and
 * intro on top, entries numbered, audio rows inline), or every active entry
 * of a kind or subject. Filter/sort menu from #396 is not built yet.
 */

import { api } from "@xolace/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Stack, useIsPreview } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { TrackRow } from "@/features/browse/components/track-row";
import { trackLibrary } from "@/features/library/analytics";
import { CoverImage } from "@/features/library/cover-image";
import { EntryRow } from "@/features/library/home/entry-cards";
import {
	facetLabel,
	KINDS,
	type Kind,
} from "@/features/library/home/library-copy";
import { HubSkeleton, RowsSkeleton } from "@/features/library/skeletons";

export type ListBy = { hub: string } | { kind: Kind } | { subject: string };

function HubList({ slug }: { slug: string }) {
	const { width } = useWindowDimensions();
	const hub = useQuery(api.library.hubs.getHub, { slug });
	if (hub === undefined) {
		return <HubSkeleton />;
	}
	if (hub === null) {
		return <Empty line="This hub has been put away." />;
	}

	let n = 0;
	return (
		<>
			<View
				className="bg-surface-secondary"
				style={{ height: width * 0.62, width }}
			>
				<CoverImage
					style={{ height: "100%", width: "100%" }}
					thumbhash={hub.coverThumbhash}
					transition={200}
					uri={hub.coverUrl}
				/>
			</View>
			<View className="gap-2 px-4 pt-5 pb-2">
				<AppText
					accessibilityRole="header"
					className="font-bold text-[30px] leading-[35px]"
				>
					{hub.title}
				</AppText>
				<AppText className="text-[16px] text-muted leading-[22px]">
					{hub.intro}
				</AppText>
			</View>
			{hub.items.map((item) =>
				item.kind === "entry" ? (
					<EntryRow
						entry={item.entry}
						from="hub"
						hub={slug}
						index={n++}
						key={item.entry._id}
					/>
				) : (
					<TrackRow
						from="library-hub"
						key={item.track._id}
						track={item.track}
					/>
				)
			)}
		</>
	);
}

function EntryList({ kind, subject }: { kind?: Kind; subject?: string }) {
	const entries = useQuery(api.library.entries.listEntries, { kind, subject });
	if (entries === undefined) {
		return <RowsSkeleton />;
	}
	if (entries.length === 0) {
		return <Empty line="Nothing here yet." />;
	}
	return entries.map((e) => (
		<EntryRow entry={e} from={kind ? "kind" : "subject"} key={e._id} />
	));
}

const Empty = ({ line }: { line: string }) => (
	<AppText className="px-4 pt-12 text-center text-[15px] text-muted">
		{line}
	</AppText>
);

/** One branch on what the list is of: its header title and its rows. */
function listOf(by: ListBy) {
	if ("hub" in by) {
		return { rows: <HubList slug={by.hub} />, title: "" };
	}
	if ("kind" in by) {
		return {
			rows: <EntryList kind={by.kind} />,
			title: KINDS.find((k) => k.kind === by.kind)?.label ?? "",
		};
	}
	return {
		rows: <EntryList subject={by.subject} />,
		title: facetLabel(by.subject),
	};
}

export function LibraryListScreen({ by }: { by: ListBy }) {
	const { title, rows } = listOf(by);
	const posthog = usePostHog();
	const key = "hub" in by ? by.hub : "kind" in by ? by.kind : by.subject;
	const isPreview = useIsPreview(); // a long-press preview isn't an open

	const trackedFor = useRef<string | null>(null);
	useEffect(() => {
		if (isPreview || trackedFor.current === key) {
			return;
		}
		trackedFor.current = key;
		if ("hub" in by) {
			trackLibrary(posthog, "library_hub_opened", { hub: by.hub });
		} else if ("kind" in by) {
			trackLibrary(posthog, "library_kind_opened", { kind: by.kind });
		} else {
			trackLibrary(posthog, "library_subject_opened", { subject: by.subject });
		}
		// Once per list, not per render of the `by` object; a preview counts once it becomes the real screen.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [key, isPreview]);

	return (
		<>
			<Stack.Screen options={{ title }} />
			<ScrollView
				className="flex-1 bg-background"
				contentContainerStyle={{ paddingBottom: 120 }}
				contentInsetAdjustmentBehavior="automatic"
			>
				{rows}
			</ScrollView>
		</>
	);
}
