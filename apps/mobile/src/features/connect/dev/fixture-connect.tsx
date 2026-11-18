/** Connect and Archived on fixtures, through the same providers as the app. Taps do nothing,
 * except the ones a state needs to show itself (the segment, the filter, the delete dialog). */
import { Stack } from "expo-router";
import { useState } from "react";
import { useHeaderOptions } from "@/lib/header-options";
import { ArchivedProvider } from "../archived/archived-data";
import { ArchivedScreen } from "../archived/archived-screen";
import { ConnectProvider, type ConnectScreenData } from "../connect-data";
import { ConnectScreen } from "../connect-screen";
import { COPY } from "../copy";
import {
	archivedCount,
	archivedRows,
	type ConversationRow,
	chatRows,
	chatsEmpty,
	type PairRowView,
	type Segment,
	type StreamSnapshot,
} from "../list/chats-model";
import type { RowActions } from "../list/row-actions";
import {
	type DirectoryRow,
	filterChips,
	presentIds,
	rosterCards,
} from "../roster/roster-model";
import { CONVERSATIONS, DIRECTORY, NOW, STREAM } from "./fixtures";

const noop = () => undefined;

function useFixtureRows() {
	const [deleteFor, setDeleteFor] = useState<PairRowView | null>(null);
	const actions: RowActions = {
		askDelete: setDeleteFor,
		close: noop,
		open: noop,
		toggleArchive: () => Promise.resolve(false),
	};
	const deleting = {
		cancel: () => setDeleteFor(null),
		confirm: () => setDeleteFor(null),
		open: deleteFor !== null,
	};
	return { actions, deleting };
}

export type ConnectFixture = {
	conversations?: ConversationRow[];
	stream?: StreamSnapshot;
	/** Null: the directory still loading. */
	directory?: DirectoryRow[] | null;
	segment?: Segment;
	filter?: string | null;
	phase?: "loading" | "disabled";
	setupBanner?: boolean;
	myProfile?: { paused: boolean } | null;
};

export function FixtureConnect({
	conversations = CONVERSATIONS,
	stream = STREAM,
	directory = DIRECTORY,
	segment: initialSegment = "chats",
	filter: initialFilter = null,
	phase,
	setupBanner = false,
	myProfile = null,
}: ConnectFixture) {
	const header = useHeaderOptions("large");
	const [segment, setSegment] = useState<Segment>(initialSegment);
	const [filter, setFilter] = useState<string | null>(initialFilter);
	const { actions, deleting } = useFixtureRows();
	const value: ConnectScreenData = {
		actions: {
			...actions,
			openArchived: noop,
			openMyProfile: noop,
			openSetup: noop,
			openXolacer: noop,
			setFilter,
			setSegment,
		},
		deleting,
		state: phase
			? { phase }
			: {
					archivedCount: archivedCount(conversations),
					empty: chatsEmpty(conversations),
					myProfile,
					phase: "ready",
					roster: {
						cards:
							directory === null
								? undefined
								: rosterCards(
										directory,
										conversations,
										filter,
										presentIds(directory)
									),
						filter,
						filters: filterChips(directory ?? [], filter),
					},
					rows: chatRows(conversations, stream, NOW),
					segment,
					setupBanner,
				},
	};
	return (
		<ConnectProvider value={value}>
			<Stack.Screen options={{ ...header, title: COPY.title }} />
			<ConnectScreen />
		</ConnectProvider>
	);
}

export function FixtureArchived({
	conversations = CONVERSATIONS,
}: {
	conversations?: ConversationRow[];
}) {
	const header = useHeaderOptions("small");
	const { actions, deleting } = useFixtureRows();
	return (
		<ArchivedProvider
			value={{
				actions,
				deleting,
				state: { rows: archivedRows(conversations, STREAM, NOW) },
			}}
		>
			<Stack.Screen options={{ ...header, title: COPY.archivedTitle }} />
			<ArchivedScreen />
		</ArchivedProvider>
	);
}
