import { useAuth } from "@clerk/expo";
import { useEffect } from "react";
import { connectPlan } from "@/features/xolacer-chat/connect-plan";
import { resetChatLocalData } from "@/features/xolacer-chat/offline-db";
import { readStreamCredential } from "@/features/xolacer-chat/stream-credential";

/** The single reset choke point for on-device chat data. Mounted at the root because
 * `(protected)` unmounts before `userId` is ever null; `connectPlan` decides, this carries it
 * out. */
export function ChatLocalDataGuard() {
	const { isLoaded, userId } = useAuth();

	useEffect(() => {
		if (!isLoaded) {
			return;
		}
		const { resetDb } = connectPlan({
			cachedCredential: readStreamCredential(),
			cachedEnabled: false,
			clerkUserId: userId ?? null,
			liveStatus: undefined,
		});
		if (!resetDb) {
			return;
		}
		resetChatLocalData().catch((error) =>
			console.error("[xolacer-chat] local data reset failed", error)
		);
	}, [isLoaded, userId]);

	return null;
}
