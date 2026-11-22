import { zustandJSONStorage } from "@/lib/storage/unified-storage";

export type StreamCredential = {
	clerkUserId: string;
	apiKey: string;
	token: string;
	userId: string;
};

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
