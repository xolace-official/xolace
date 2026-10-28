import { zustandJSONStorage } from "@/lib/storage/unified-storage";

/** What `xolacerChat.getStreamToken` returns, plus who it was minted for. */
export type StreamCredential = {
	clerkUserId: string;
	apiKey: string;
	token: string;
	userId: string;
};

/** Not in the Zustand store: that is devtools-visible state and this is a bearer credential.
 * The token's server-side `exp` bounds a lost device (`convex/integrations/stream.ts`). */
const KEY = "xolace-stream-credential";

export function readStreamCredential(): StreamCredential | null {
	try {
		const raw = zustandJSONStorage.getItem(KEY);
		return raw ? (JSON.parse(raw) as StreamCredential) : null;
	} catch {
		return null;
	}
}

export function writeStreamCredential(credential: StreamCredential) {
	void zustandJSONStorage.setItem(KEY, JSON.stringify(credential));
}

export function clearStreamCredential() {
	void zustandJSONStorage.removeItem(KEY);
}
