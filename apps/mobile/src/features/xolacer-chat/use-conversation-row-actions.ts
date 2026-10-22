import { api } from "@xolace/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { useToast } from "heroui-native";
import { useEffect, useState } from "react";
import { useAccessibilityInfo } from "@/src/helpers/hooks/use-accessability-info";
import { playAffirmativePress } from "@/src/lib/haptics";
import { setTabBarHidden } from "@/src/lib/tab-bar";
import type { PairConversation } from "./components/chats-list";

/**
 * The long-press actions for a conversation row, and the row they belong to.
 *
 * This lives above the list rather than inside it because of where the sheet
 * has to render: on Android the bottom toolbar is an ordinary absolutely
 * filling view, so it bottom-aligns to whatever it is mounted in. Inside the
 * scrolling list that means the middle of the screen. The caller renders it as
 * a sibling of the scroll view, which is the only place "bottom" means the
 * bottom of the screen on both platforms.
 */
export function useConversationRowActions() {
	const { toast } = useToast();
	const archiveConversation = useMutation(api.xolacerChat.archiveConversation);
	const unarchiveConversation = useMutation(
		api.xolacerChat.unarchiveConversation
	);
	const restConversation = useMutation(api.xolacerChat.restConversation);
	const deleteConversation = useMutation(api.xolacerChat.deleteConversation);
	const { screenReaderEnabled } = useAccessibilityInfo();
	// The long-pressed row, which is also what the action sheet is: the bottom
	// toolbar only exists while something is selected.
	const [sheetFor, setSheetFor] = useState<PairConversation | null>(null);
	// The row Delete was tapped on — and, the same way, what the confirmation
	// dialog is. Delete is the only one of these that can't be undone, so it is
	// the only one that asks first.
	const [deleteFor, setDeleteFor] = useState<PairConversation | null>(null);

	// The sheet and the floating tab bar are the same strip of screen: left up,
	// the tab pill sits between Cancel and Archive and swallows the taps under
	// it. The cleanup also covers navigating away with the sheet still open.
	useEffect(() => {
		setTabBarHidden(sheetFor !== null);
		return () => setTabBarHidden(false);
	}, [sheetFor]);

	const archiveCall = (conversation: PairConversation, archive: boolean) =>
		(archive ? archiveConversation : unarchiveConversation)({
			conversationId: conversation.id,
		})
			.then(() => true)
			.catch((err: unknown) => {
				console.error("[xolacer-chat] archive toggle failed", err);
				toast.show({
					description: "Something went wrong. Try again.",
					label: archive ? "Couldn't archive" : "Couldn't unarchive",
					variant: "default",
				});
				return false;
			});

	/**
	 * Shared by the long-press sheet and the row swipe. Both stamps are
	 * reversible, so this offers Undo instead of asking first. The swipe plays
	 * its own haptic at commit, so it passes `haptic: false`.
	 * Resolves false if the mutation failed, so a swiped row can close again.
	 */
	const toggleArchive = (
		conversation: PairConversation,
		{ haptic = true } = {}
	) => {
		setSheetFor(null);
		if (haptic) {
			playAffirmativePress();
		}
		const archive = !conversation.archived;
		// After the server confirms, not before: the row has no optimistic
		// update, so this lands as it leaves the list, and a failure never shows
		// "Archived" beside "Couldn't archive".
		return archiveCall(conversation, archive).then((ok) => {
			if (!ok) {
				return false;
			}
			toast.show({
				actionLabel: "Undo",
				// Doubled with a screen reader on: the toast is announced, then the
				// user still has to find and activate Undo.
				duration: screenReaderEnabled ? 12_000 : 6000,
				label: archive ? "Archived" : "Moved back to Chats",
				onActionPress: ({ hide }) => {
					hide();
					void archiveCall(conversation, !archive);
				},
			});
			return true;
		});
	};

	const close = (conversation: PairConversation) => {
		setSheetFor(null);
		playAffirmativePress();
		restConversation({ conversationId: conversation.id }).catch(
			(err: unknown) => {
				console.error("[xolacer-chat] close failed", err);
				toast.show({
					description: "Something went wrong. Try again.",
					label: "Couldn't close",
					variant: "default",
				});
			}
		);
	};

	const confirmDelete = () => {
		const conversation = deleteFor;
		if (!conversation) {
			return;
		}
		setDeleteFor(null);
		playAffirmativePress();
		deleteConversation({ conversationId: conversation.id }).catch(
			(err: unknown) => {
				console.error("[xolacer-chat] delete failed", err);
				toast.show({
					description: "Something went wrong. Try again.",
					label: "Couldn't delete",
					variant: "default",
				});
			}
		);
	};

	return {
		close,
		confirmDelete,
		deleteFor,
		setDeleteFor,
		setSheetFor,
		sheetFor,
		toggleArchive,
	};
}
