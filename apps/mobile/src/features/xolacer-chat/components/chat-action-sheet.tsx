import { Stack } from 'expo-router';
import ArchiveIcon from '@expo/material-symbols/archive.xml';
import BedtimeIcon from '@expo/material-symbols/bedtime.xml';
import CloseIcon from '@expo/material-symbols/close.xml';
import DeleteIcon from '@expo/material-symbols/delete.xml';
import UnarchiveIcon from '@expo/material-symbols/unarchive.xml';
import { canDelete, canManualRest } from '@/convex/lib/conversationGating';
import type { PairConversation } from './chats-list';

export type ChatActionSheetProps = {
  conversation: PairConversation;
  onDismiss: () => void;
  onArchive: () => void;
  onClose: () => void;
  onDelete: () => void;
};

/**
 * The long-press actions for one conversation row, in the native bottom
 * toolbar.
 *
 * The two platforms draw the same toolbar differently, and both branches are
 * required rather than cosmetic: Android renders the icon only (a text child
 * is dropped, which is why this shipped as an empty strip), and its spacer
 * needs an explicit width because the flexible one renders nothing. iOS keeps
 * the labels it already had. `process.env.EXPO_OS` is inlined at build time,
 * so neither platform bundles the other's icons.
 */
export function ChatActionSheet({
  conversation,
  onDismiss,
  onArchive,
  onClose,
  onDelete,
}: ChatActionSheetProps) {
  const android = process.env.EXPO_OS === 'android';
  return (
    <Stack.Toolbar placement="bottom">
      <Stack.Toolbar.Button
        icon={android ? CloseIcon : undefined}
        onPress={onDismiss}
      >
        Cancel
      </Stack.Toolbar.Button>
      <Stack.Toolbar.Spacer width={android ? 24 : undefined} />
      {canManualRest(conversation, conversation.role) && (
        // Wrapping a conversation up is the resting transition, so it takes
        // the resting metaphor's icon rather than an X, which would read as
        // "delete this" — the one thing Close never does.
        <Stack.Toolbar.Button
          icon={android ? BedtimeIcon : undefined}
          onPress={onClose}
        >
          Close
        </Stack.Toolbar.Button>
      )}
      <Stack.Toolbar.Button
        icon={android ? (conversation.archived ? UnarchiveIcon : ArchiveIcon) : undefined}
        onPress={onArchive}
      >
        {conversation.archived ? 'Unarchive' : 'Archive'}
      </Stack.Toolbar.Button>
      {canDelete(conversation) && (
        // Only ever on a declined or expired request — the two outcomes that
        // never became a conversation. Unlike the rest of this toolbar it asks
        // first, because this one doesn't come back.
        <Stack.Toolbar.Button
          icon={android ? DeleteIcon : undefined}
          onPress={onDelete}
        >
          Delete
        </Stack.Toolbar.Button>
      )}
    </Stack.Toolbar>
  );
}
