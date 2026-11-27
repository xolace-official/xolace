export type OfflineClaims = {
	/** Takes a claim; call the returned function to let it go. */
	claim: () => () => void;
	claimed: () => boolean;
	subscribe: (listener: () => void) => () => void;
};

/**
 * Screens that show their own connection message claim the offline message, and the root
 * banner hides while any claim is held. Each claim is its own token, so a thread pushed over
 * a channel that also claims keeps the banner hidden until both let go.
 */
export function createOfflineClaims(): OfflineClaims {
	const held = new Set<symbol>();
	const listeners = new Set<() => void>();
	const notify = () => {
		for (const listener of listeners) {
			listener();
		}
	};
	return {
		claim() {
			const token = Symbol("offline-claim");
			held.add(token);
			if (held.size === 1) {
				notify();
			}
			return () => {
				if (held.delete(token) && held.size === 0) {
					notify();
				}
			};
		},
		claimed: () => held.size > 0,
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}
