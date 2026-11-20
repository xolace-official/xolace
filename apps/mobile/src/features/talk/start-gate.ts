export type StartGate = {
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
