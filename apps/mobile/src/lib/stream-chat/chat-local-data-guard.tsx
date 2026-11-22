import { useAuth } from "@clerk/expo";
import { useEffect } from "react";
import { connectPlan } from "@/lib/stream-chat/connect-plan";
import { resetChatLocalData } from "@/lib/stream-chat/offline-db";
import { readStreamCredential } from "@/lib/stream-chat/stream-credential";

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
