import { Stack } from "expo-router";
import { useState } from "react";
import { useHeaderOptions } from "@/lib/header-options";
import { ArchivedProvider } from "../archived/archived-data";
import { ArchivedScreen } from "../archived/archived-screen";
import { ConnectProvider, type ConnectScreenData } from "../connect-data";
import { type ChatStatus, connectState } from "../connect-model";
import { ConnectScreen } from "../connect-screen";
import { COPY } from "../copy";
import { deviceClock } from "../device-clock";
import {
	archivedRows,
	type ConversationRow,
	type PairRowView,
	type Segment,
	type StreamSnapshot,
} from "../list/chats-model";
import type { RowActions } from "../list/row-actions";
import { type DirectoryRow, presentIds } from "../roster/roster-model";
import { CONVERSATIONS, DIRECTORY, NOW, SEEKER, STREAM } from "./fixtures";

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
	directory?: DirectoryRow[] | null;
	segment?: Segment;
	filter?: string | null;
	status?: ChatStatus;
	loading?: boolean;
};

export function FixtureConnect({
	conversations = CONVERSATIONS,
	stream = STREAM,
	directory = DIRECTORY,
	segment: initialSegment = "chats",
	filter: initialFilter = null,
	status = SEEKER,
	loading = false,
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
		state: connectState({
			clock: deviceClock(),
			conversations: loading ? undefined : conversations,
			directory: directory ?? undefined,
			filter,
			now: NOW,
			picked: segment,
			presentSnapshot: directory ? presentIds(directory) : null,
			status: loading ? undefined : status,
			stream,
		}),
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
	loading = false,
}: {
	conversations?: ConversationRow[];
	loading?: boolean;
}) {
	const header = useHeaderOptions("small");
	const { actions, deleting } = useFixtureRows();
	return (
		<ArchivedProvider
			value={{
				actions,
				deleting,
				state: {
					rows: loading
						? undefined
						: archivedRows(conversations, STREAM, NOW, deviceClock()),
				},
			}}
		>
			<Stack.Screen options={{ ...header, title: COPY.archivedTitle }} />
			<ArchivedScreen />
		</ArchivedProvider>
	);
}
