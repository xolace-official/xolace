/**
 * One start at a time. Starting a talk awaits the microphone ask and the server before the
 * voice pipeline says it has started, so a second tap in that gap would open a second
 * session. The gate is taken on the first tap, before anything is awaited, and let go
 * however the attempt ends: denied, failed, or the talk is up (Start is gone by then).
 */
export type StartGate = {
	/** Runs `attempt` unless one is already running; false if it was turned away. */
	run: (attempt: () => Promise<void>) => Promise<boolean>;
	readonly busy: boolean;
};

export function createStartGate(): StartGate {
	let busy = false;
	return {
		get busy() {
			return busy;
		},
		async run(attempt) {
			if (busy) {
				return false;
			}
			busy = true;
			try {
				await attempt();
			} finally {
				busy = false;
			}
			return true;
		},
	};
}
