const settle = (task: () => Promise<unknown>) =>
	Promise.resolve()
		.then(task)
		.then(
			() => true,
			() => false
		);

export function createPathFlight() {
	let starting: Promise<boolean> | null = null;
	return {
		async complete(task: () => Promise<unknown>): Promise<boolean> {
			await starting;
			return settle(task);
		},
		start(task: () => Promise<unknown>): Promise<boolean> {
			if (starting) {
				return Promise.resolve(false);
			}
			const attempt = settle(task);
			starting = attempt;
			attempt.then(() => {
				starting = null;
			});
			return attempt;
		},
	};
}
