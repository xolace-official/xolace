import type { Undo } from "../letters-model";

/** When an act commits: and then what (Hide goes back), and whether its Undo stays up meanwhile. */
type Commit = {
	commit: () => void;
	after?: () => void;
	/** Keep showing the act once it commits, so nothing springs back while the screen leaves. */
	hold?: boolean;
};

/**
 * One undoable act at a time, with no React (handoff §3): `begin` shows it (`onChange(kind)`)
 * and commits it once `ms` pass, then runs `after`. `cancel` is Undo: nothing commits. `leave` is
 * the reader closing: a running act commits at once, without its `after` (no going back twice).
 * A `begin` while one runs is ignored, so timers never stack.
 */
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
		/** Undo. Nothing to undo once an act committed: a held Hide stays up while the reader leaves. */
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
