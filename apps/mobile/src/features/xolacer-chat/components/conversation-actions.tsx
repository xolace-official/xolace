import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import type { useConversationRowActions } from "../use-conversation-row-actions";
import { ChatActionSheet } from "./chat-action-sheet";

/** The long-press sheet and delete confirmation, rendered as a sibling of the scroll view
 * (Android's bottom toolbar bottom-aligns to its mount). Close is the `resting` transition, so
 * no confirmation. */
export function ConversationActions({
	actions,
}: {
	actions: ReturnType<typeof useConversationRowActions>;
}) {
	const {
		sheetFor,
		setSheetFor,
		toggleArchive,
		close,
		deleteFor,
		setDeleteFor,
		confirmDelete,
	} = actions;

	return (
		<>
			{sheetFor && (
				<ChatActionSheet
					conversation={sheetFor}
					onArchive={() => toggleArchive(sheetFor)}
					onClose={() => close(sheetFor)}
					onDelete={() => {
						setSheetFor(null);
						setDeleteFor(sheetFor);
					}}
					onDismiss={() => setSheetFor(null)}
				/>
			)}

			<ConfirmationDialog
				confirmLabel="Delete"
				description="It disappears from your list for good. Their copy stays until they delete it too."
				isDestructive
				isOpen={deleteFor !== null}
				onConfirm={confirmDelete}
				onOpenChange={(open) => !open && setDeleteFor(null)}
				title="Delete this request?"
			/>
		</>
	);
}
