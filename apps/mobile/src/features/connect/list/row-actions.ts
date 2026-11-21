import type { ChatRowView, PairRowView } from "./chats-model";

export type RowActions = {
	open: (row: ChatRowView) => void;
	toggleArchive: (
		row: PairRowView,
		options?: { haptic?: boolean }
	) => Promise<boolean>;
	close: (row: PairRowView) => void;
	askDelete: (row: PairRowView) => void;
};

export type DeleteConfirm = {
	open: boolean;
	confirm: () => void;
	cancel: () => void;
};

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
