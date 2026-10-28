import { api } from "@xolace/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { useToast } from "heroui-native";
import { useEffect, useState } from "react";
import { useAccessibilityInfo } from "@/helpers/hooks/use-accessability-info";
import { playAffirmativePress } from "@/lib/haptics";
import { setTabBarHidden } from "@/lib/tab-bar";
import type { PairConversation } from "./components/chats-list";

/** Long-press actions for a conversation row. Lives above the list because on Android the
 * bottom toolbar bottom-aligns to its mount, so the sheet must be a sibling of the scroll
 * view. */
export function useConversationRowActions() {
	const { toast } = useToast();
	const archiveConversation = useMutation(api.xolacerChat.archiveConversation);
	const unarchiveConversation = useMutation(
		api.xolacerChat.unarchiveConversation
	);
	const restConversation = useMutation(api.xolacerChat.restConversation);
	const deleteConversation = useMutation(api.xolacerChat.deleteConversation);
	const { screenReaderEnabled } = useAccessibilityInfo();
	// The long-pressed row; the bottom toolbar exists only while one is selected.
	const [sheetFor, setSheetFor] = useState<PairConversation | null>(null);
	// The row Delete was tapped on; delete is the only irreversible action, so it asks first.
	const [deleteFor, setDeleteFor] = useState<PairConversation | null>(null);

	// The sheet and the floating tab bar share one strip; left up, the pill swallows
	// taps. The cleanup also covers navigating away with the sheet still open.
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

	/** Shared by the sheet and the swipe. Reversible, so Undo instead of a confirm; resolves
	 * false on failure so a swiped row can close again. */
	const toggleArchive = (
		conversation: PairConversation,
		{ haptic = true } = {}
	) => {
		setSheetFor(null);
		if (haptic) {
			playAffirmativePress();
		}
		const archive = !conversation.archived;
		// After the server confirms: the row has no optimistic update, and a
		// failure must never show "Archived" beside "Couldn't archive".
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
