import ArchiveIcon from "@expo/material-symbols/archive.xml";
import BedtimeIcon from "@expo/material-symbols/bedtime.xml";
import CloseIcon from "@expo/material-symbols/close.xml";
import DeleteIcon from "@expo/material-symbols/delete.xml";
import UnarchiveIcon from "@expo/material-symbols/unarchive.xml";
import {
	canDelete,
	canManualRest,
} from "@xolace/backend/convex/lib/conversationGating";
import { Stack } from "expo-router";
import type { PairConversation } from "./chats-list";

export type ChatActionSheetProps = {
	conversation: PairConversation;
	onDismiss: () => void;
	onArchive: () => void;
	onClose: () => void;
	onDelete: () => void;
};

/** Long-press actions in the native bottom toolbar. Android drops a text child and renders a
 * flexible spacer as nothing, so it needs the icons and an explicit spacer width. */
export function ChatActionSheet({
	conversation,
	onDismiss,
	onArchive,
	onClose,
	onDelete,
}: ChatActionSheetProps) {
	const android = process.env.EXPO_OS === "android";
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
				<Stack.Toolbar.Button
					icon={android ? BedtimeIcon : undefined}
					onPress={onClose}
				>
					Close
				</Stack.Toolbar.Button>
			)}
			<Stack.Toolbar.Button
				icon={
					android
						? conversation.archived
							? UnarchiveIcon
							: ArchiveIcon
						: undefined
				}
				onPress={onArchive}
			>
				{conversation.archived ? "Unarchive" : "Archive"}
			</Stack.Toolbar.Button>
			{canDelete(conversation) && (
				// Only on a declined or expired request; asks first because it cannot be undone.
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
