/**
 * What a chat row does, on Connect and Archived: production's archive, unarchive, close and
 * delete mutations, its toasts (Undo after an archive) and haptics, and opening a thread.
 */
import { api } from "@xolace/backend/api";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import { toast } from "@/components/shared/toast";
import { playAffirmativePress, playSoftPress } from "@/lib/haptics";
import { COPY } from "./copy";
import type { ChatRowView, PairRowView } from "./list/chats-model";
import type { DeleteConfirm, RowActions } from "./list/row-actions";

/** Production's log line beside the toast, so a failed mutation still shows up in the logs. */
const fail = (label: string, what: string, error: unknown) => {
	console.error(`[connect] ${what} failed`, error);
	toast(label, { description: COPY.toast.tryAgain, variant: "danger" });
};

export function useRowActions(): {
	actions: RowActions;
	deleting: DeleteConfirm;
} {
	const router = useRouter();
	const archive = useMutation(api.xolacerChat.archiveConversation);
	const unarchive = useMutation(api.xolacerChat.unarchiveConversation);
	const rest = useMutation(api.xolacerChat.restConversation);
	const remove = useMutation(api.xolacerChat.deleteConversation);
	// The row Delete was chosen on; delete is the one irreversible action, so it asks first.
	const [deleteFor, setDeleteFor] = useState<PairRowView | null>(null);

	const setArchived = (row: PairRowView, to: boolean) =>
		(to ? archive : unarchive)({ conversationId: row.id })
			.then(() => true)
			.catch((error: unknown) => {
				fail(
					to ? COPY.toast.archiveFailed : COPY.toast.unarchiveFailed,
					"archive toggle",
					error
				);
				return false;
			});

	const open = (row: ChatRowView) => {
		playSoftPress();
		if (row.kind === "broadcast") {
			router.push("/xolace-channel");
			return;
		}
		router.push({
			params: { conversationId: row.id },
			pathname: "/chat/[conversationId]",
		});
	};

	// Reversible, so Undo instead of a confirm. After the server confirms: the row has no
	// optimistic update, and a failure must never show "Archived" beside "Couldn't archive".
	const toggleArchive: RowActions["toggleArchive"] = async (
		row,
		{ haptic = true } = {}
	) => {
		if (haptic) {
			playAffirmativePress();
		}
		const to = !row.menu.archived;
		const ok = await setArchived(row, to);
		if (ok) {
			toast(to ? COPY.toast.archived : COPY.toast.unarchived, {
				action: {
					label: COPY.toast.undo,
					onPress: () => {
						setArchived(row, !to).catch(() => undefined);
					},
				},
			});
		}
		return ok;
	};

	return {
		actions: {
			askDelete: setDeleteFor,
			close: (row) => {
				playAffirmativePress();
				rest({ conversationId: row.id }).catch((error: unknown) =>
					fail(COPY.toast.closeFailed, "close", error)
				);
			},
			open,
			toggleArchive,
		},
		deleting: {
			cancel: () => setDeleteFor(null),
			confirm: () => {
				const row = deleteFor;
				if (!row) {
					return;
				}
				setDeleteFor(null);
				playAffirmativePress();
				remove({ conversationId: row.id }).catch((error: unknown) =>
					fail(COPY.toast.deleteFailed, "delete", error)
				);
			},
			open: deleteFor !== null,
		},
	};
}
