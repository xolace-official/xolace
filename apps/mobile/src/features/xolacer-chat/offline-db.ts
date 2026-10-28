import { StreamChat } from "stream-chat";
import { OfflineDB, SqliteClient } from "stream-chat-expo";
import { clearStreamCredential } from "@/features/xolacer-chat/stream-credential";
import { useAppStore } from "@/store/store";

/** Attaches the sqlite store; `setOfflineDBApi` is a no-op once set. Opens no file (that is
 * `offlineDb.init`). */
export function attachOfflineDb(client: StreamChat) {
	client.setOfflineDBApi(new OfflineDB({ client }));
}

// Generation boundary between a reset and anything that opens or fills the db
// after it: readers await `chatLocalDataSettled()` and drop their work if
// `chatLocalDataGeneration()` moved past the generation they were given.
let generation = 0;
let settled: Promise<void> = Promise.resolve();

export const chatLocalDataGeneration = () => generation;

/** Resolves once no reset is in flight, with the generation that then holds; sampled before the
 * wait so a reset chained meanwhile is not mistaken for settled. */
export async function chatLocalDataSettled(): Promise<number> {
	for (;;) {
		const before = generation;
		await settled;
		if (before === generation) {
			return before;
		}
	}
}

/** The one place on-device chat data is wiped (sqlite, credential, cached gate); only
 * `ChatLocalDataGuard` calls it. */
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
	// Chained onto the previous reset so two never drop tables at once.
	settled = settled
		.catch(() => {})
		.then(async () => {
			// `resetDB` only drops tables through an open handle; a switch that
			// happened while the app was closed arrives here with none.
			if (!SqliteClient.db) {
				await SqliteClient.openDB();
			}
			await (offlineDb?.resetDB() ?? SqliteClient.resetDB());
			// Stream's sign-out order: `resetDB`, then `disconnectUser`. It never
			// touches sqlite and is harmless without a user, so the provider's own
			// disconnect landing later is fine.
			await client?.disconnectUser();
		});
	return settled;
}

/** Loads stored channels into `client.activeChannels` (the SDK only does this inside
 * `ChannelList`); live ones are left alone so a fresher state is not regressed. */
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
