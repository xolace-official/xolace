import { StreamChat } from "stream-chat";
import { OfflineDB, SqliteClient } from "stream-chat-expo";
import { clearStreamCredential } from "@/lib/stream-chat/stream-credential";
import { useAppStore } from "@/store/store";

export function attachOfflineDb(client: StreamChat) {
	client.setOfflineDBApi(new OfflineDB({ client }));
}

let generation = 0;
let settled: Promise<void> = Promise.resolve();

export const chatLocalDataGeneration = () => generation;

export async function chatLocalDataSettled(): Promise<number> {
	for (;;) {
		const before = generation;
		await settled;
		if (before === generation) {
			return before;
		}
	}
}

export function resetChatLocalData() {
	generation += 1;
	clearStreamCredential();
	useAppStore.getState().setChatEnabledCached(false);
	// Marked uninitialised first: the SDK's event writes go through
	// `executeQuerySafely`, which no-ops on that flag, so a closing socket can't
	// write the old account into fresh tables; it also makes the next `init()` re-run.
	const key = process.env.EXPO_PUBLIC_STREAM_API_KEY;
	const client = key ? StreamChat.getInstance(key) : undefined;
	const offlineDb = client?.offlineDb;
	offlineDb?.state.partialNext({ initialized: false, userId: undefined });
	settled = settled
		.catch(() => {})
		.then(async () => {
			// `resetDB` only drops tables through an open handle; a switch that
			// happened while the app was closed arrives here with none.
			if (!SqliteClient.db) {
				await SqliteClient.openDB();
			}
			await (offlineDb?.resetDB() ?? SqliteClient.resetDB());
			await client?.disconnectUser();
		});
	return settled;
}

export async function hydrateChannelsFromCache(
	client: StreamChat,
	channelIds: string[]
) {
	const { offlineDb, userID } = client;
	if (!(offlineDb && userID)) {
		return;
	}
	const cids = channelIds
		.map((id) => `messaging:${id}`)
		.filter((cid) => {
			const live = client.activeChannels[cid];
			return !(live?.initialized || live?.offlineMode);
		});
	if (cids.length === 0) {
		return;
	}
	const rows = await offlineDb.getChannels({ cids, userId: userID });
	if (!rows?.length) {
		return;
	}
	client.hydrateActiveChannels(
		rows as Parameters<StreamChat["hydrateActiveChannels"]>[0],
		{
			offlineMode: true,
		}
	);
}
