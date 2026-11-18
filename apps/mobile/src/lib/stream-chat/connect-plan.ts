/** The connection policy for `StreamChatProvider`, pure so it is table-testable
 * (`connect-plan.test.ts`). */
export type ConnectPlanInput = {
	/** Last resolved "chat is enabled for me", from the persisted toggles. */
	cachedEnabled: boolean;
	/** The on-device Stream credential, if any — only its owner matters here. */
	cachedCredential: { clerkUserId: string } | null;
	/** `xolacerChat.status().enabled` once it has resolved; `undefined` while it hasn't. */
	liveStatus: boolean | undefined;
	/** Who Clerk says is signed in right now. `null` after sign-out. */
	clerkUserId: string | null;
};

export type ConnectPlan = {
	/** Open the connection now, without waiting for a chat surface to ask. */
	activateNow: boolean;
	/** Wipe the offline database — another account's conversations live in it. */
	resetDb: boolean;
	/** Drop the persisted credential — it belongs to another account. */
	clearCredential: boolean;
};

export function connectPlan(input: ConnectPlanInput): ConnectPlan {
	const { cachedEnabled, cachedCredential, liveStatus, clerkUserId } = input;

	// Sign-out or account switch: the credential names who the on-device data
	// belongs to, and it is written before the first connect, so "no credential"
	// means "no data" — a user who never opened chat never touches sqlite.
	const foreign =
		cachedCredential !== null && cachedCredential.clerkUserId !== clerkUserId;
	if (foreign) {
		return { activateNow: false, clearCredential: true, resetDb: true };
	}
	if (clerkUserId === null) {
		return { activateNow: false, clearCredential: false, resetDb: false };
	}

	// The server's word beats the cache. `false` keeps the credential: a kill
	// switch is a pause, not a sign-out, and the token has its own expiry.
	if (liveStatus === false) {
		return { activateNow: false, clearCredential: false, resetDb: false };
	}
	if (liveStatus === true) {
		return { activateNow: true, clearCredential: false, resetDb: false };
	}

	// Nothing live yet: connect eagerly only when there is a round trip to skip.
	return {
		activateNow: cachedEnabled && cachedCredential !== null,
		clearCredential: false,
		resetDb: false,
	};
}
