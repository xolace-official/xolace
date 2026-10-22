import { ConfirmationDialog } from '@/src/components/shared/confirmation-dialog';
import type { useConversationRowActions } from '../use-conversation-row-actions';
import { ChatActionSheet } from './chat-action-sheet';

/**
 * The long-press sheet and the delete confirmation, together.
 *
 * Rendered as a sibling of a screen's scroll view rather than inside its list —
 * on Android the bottom toolbar bottom-aligns to whatever it is mounted in, and
 * inside a scroll view that lands it over the middle of the screen. Every
 * screen showing conversation rows mounts its own; this component is so both of
 * them say it the same way. Close is the xolacer wrapping an open conversation
 * up early, the same `resting` the quiet sweep would reach in 14 days, so it
 * runs on the tap with no confirmation and nothing is lost either way.
 */
export function ConversationActions({
  actions,
}: {
  actions: ReturnType<typeof useConversationRowActions>;
}) {
  const { sheetFor, setSheetFor, toggleArchive, close, deleteFor, setDeleteFor, confirmDelete } =
    actions;

  return (
    <>
      {sheetFor && (
        <ChatActionSheet
          conversation={sheetFor}
          onDismiss={() => setSheetFor(null)}
          onArchive={() => toggleArchive(sheetFor)}
          onClose={() => close(sheetFor)}
          onDelete={() => {
            setSheetFor(null);
            setDeleteFor(sheetFor);
          }}
        />
      )}

      <ConfirmationDialog
        isOpen={deleteFor !== null}
        onOpenChange={(open) => !open && setDeleteFor(null)}
        title="Delete this request?"
        description="It disappears from your list for good. Their copy stays until they delete it too."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        isDestructive
      />
    </>
  );
}
