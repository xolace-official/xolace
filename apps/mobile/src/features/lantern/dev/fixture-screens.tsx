import { useState } from "react";
import { COPY } from "@/features/lantern/copy";
import { SUBJECTS } from "@/features/lantern/dev/fixtures";
import {
	type Home,
	HomeProvider,
	type HomeView,
} from "@/features/lantern/home/home-data";
import { HomeScreen } from "@/features/lantern/home/home-screen";
import { HubProvider, type HubView } from "@/features/lantern/hub/hub-data";
import { HubScreen } from "@/features/lantern/hub/hub-screen";
import type { ReaderFrom } from "@/features/lantern/lantern-links";
import type { CardItem } from "@/features/lantern/lantern-model";
import { ListProvider } from "@/features/lantern/lists/list-data";
import { ListScreen } from "@/features/lantern/lists/list-screen";
import { SubjectsProvider } from "@/features/lantern/subjects/subjects-data";
import { SubjectsScreen } from "@/features/lantern/subjects/subjects-screen";
import type { EntryActions } from "@/features/lantern/use-entry-actions";

const ignore = () => undefined;
const STILL: EntryActions = {
	setSaved: () => Promise.resolve(),
	share: ignore,
};
const HOME_ACTIONS: Home["actions"] = {
	answerReadingAs: ignore,
	flipAudience: ignore,
	share: ignore,
	writeStory: ignore,
};

export function FixtureHome({
	home,
	arrival = 0,
}: {
	home: HomeView | undefined;
	arrival?: number;
}) {
	return (
		<HomeProvider
			value={{
				actions: HOME_ACTIONS,
				state: { arrival, home, subjects: SUBJECTS },
			}}
		>
			<HomeScreen />
		</HomeProvider>
	);
}

export function FixtureHub({
	hub,
	playing = false,
	locked = false,
}: {
	hub: HubView | null | undefined;
	playing?: boolean;
	locked?: boolean;
}) {
	const [nowPlaying, setNowPlaying] = useState<string | null>(
		playing ? "not-the-only-one-awake" : null
	);
	const [isPlaying, setPlaying] = useState(playing);
	return (
		<HubProvider
			value={{
				actions: {
					...STILL,
					open: ignore,
					play: (track) => {
						if (locked) {
							return;
						}
						setNowPlaying(track.slug);
						setPlaying(true);
					},
					toggle: () => setPlaying((p) => !p),
				},
				state: { hub, listen: { locked, nowPlaying, playing: isPlaying } },
			}}
		>
			<HubScreen />
		</HubProvider>
	);
}

export function FixtureList({
	title,
	items,
	from,
	empty = COPY.lists.empty,
	storyCall = false,
}: {
	title: string;
	items: readonly CardItem[] | undefined;
	from: ReaderFrom;
	empty?: string;
	storyCall?: boolean;
}) {
	return (
		<ListProvider
			value={{
				actions: { ...STILL, loadMore: ignore, writeStory: ignore },
				state: {
					canLoadMore: false,
					empty,
					from,
					items,
					loadingMore: false,
					storyCall,
					title,
				},
			}}
		>
			<ListScreen />
		</ListProvider>
	);
}

export function FixtureSubjects({ letter }: { letter?: string }) {
	return (
		<SubjectsProvider value={{ state: { letter, subjects: SUBJECTS } }}>
			<SubjectsScreen />
		</SubjectsProvider>
	);
}
