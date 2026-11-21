export type SingleFlight = {
	run: (task: () => Promise<void>) => Promise<boolean>;
	readonly busy: boolean;
};

export function createSingleFlight(
	onBusy?: (busy: boolean) => void
): SingleFlight {
	let busy = false;
	const set = (next: boolean) => {
		busy = next;
		onBusy?.(next);
	};
	return {
		get busy() {
			return busy;
		},
		async run(task) {
			if (busy) {
				return false;
			}
			set(true);
			try {
				await task();
			} finally {
				set(false);
			}
			return true;
		},
	};
}
