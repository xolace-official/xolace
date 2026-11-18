import type { ChatRowView, PairRowView } from "./chats-model";

/** What a chat row can do, on Connect and on Archived alike. */
export type RowActions = {
	open: (row: ChatRowView) => void;
	/** Archive or unarchive (by the row's state). Resolves false when it failed, so a swiped
	 * row slides shut again. `haptic: false` when the swipe already played one. */
	toggleArchive: (
		row: PairRowView,
		options?: { haptic?: boolean }
	) => Promise<boolean>;
	/** A Xolacer wraps up an open chat (production's `resting`): no confirmation. */
	close: (row: PairRowView) => void;
	/** Asks first: delete can't be undone. */
	askDelete: (row: PairRowView) => void;
};

/** The delete confirmation, held open by the screen's state. */
export type DeleteConfirm = {
	open: boolean;
	confirm: () => void;
	cancel: () => void;
};

/** The row's swipe and menu, as named actions for VoiceOver and TalkBack. */
export function rowA11yActions(
	row: PairRowView,
	actions: RowActions,
	labels: { archive: string; unarchive: string; close: string; delete: string }
) {
	const list = [
		{
			label: row.menu.archived ? labels.unarchive : labels.archive,
			name: "archive",
		},
		...(row.menu.canClose ? [{ label: labels.close, name: "close" }] : []),
		...(row.menu.canDelete ? [{ label: labels.delete, name: "delete" }] : []),
	];
	return {
		accessibilityActions: list,
		onAccessibilityAction: (event: { nativeEvent: { actionName: string } }) => {
			const name = event.nativeEvent.actionName;
			if (name === "archive") {
				actions.toggleArchive(row).catch(() => undefined);
			} else if (name === "close") {
				actions.close(row);
			} else if (name === "delete") {
				actions.askDelete(row);
			}
		},
	};
}
