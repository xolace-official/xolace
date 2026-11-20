import type { Undo } from "../letters-model";

type Commit = {
	commit: () => void;
	after?: () => void;
	hold?: boolean;
};

export function createUndoTimer(
	ms: number,
	onChange: (kind: Undo | null) => void
) {
	let timer: ReturnType<typeof setTimeout> | null = null;
	let pending: (() => void) | null = null;
	const stop = () => {
		if (timer) {
			clearTimeout(timer);
		}
		timer = null;
	};
	return {
		begin: (kind: Undo, { commit, after, hold = false }: Commit): boolean => {
			if (pending) {
				return false;
			}
			pending = commit;
			onChange(kind);
			timer = setTimeout(() => {
				timer = null;
				pending = null;
				commit();
				if (!hold) {
					onChange(null);
				}
				after?.();
			}, ms);
			return true;
		},
		cancel: () => {
			if (!pending) {
				return;
			}
			stop();
			pending = null;
			onChange(null);
		},
		leave: () => {
			stop();
			const run = pending;
			pending = null;
			run?.();
		},
	};
}
