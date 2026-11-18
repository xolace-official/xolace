import { useAuth } from "@clerk/expo";
import { api } from "@xolace/backend/api";
import { useMutation } from "convex/react";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { toast } from "@/components/shared/toast";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import { DELETE_COPY, type SheetKind } from "@/features/settings/privacy/copy";
import type { DeleteSheet } from "@/features/settings/privacy/delete/delete-sheet-data";
import { useAppStore } from "@/store/store";

/**
 * The delete sheet on Convex and Clerk: production's `users.requestDataWipe` and
 * `users.requestDeletion`, and what `useDataSettings` / `useConfirmAction` did around them (the
 * local draft wiped, the account's flags cleared, signed out, the failure toast), plus the
 * board's toast once it's done.
 */
export function useDeleteSheet(
	kind: SheetKind,
	onDataWiped: () => Promise<void>
): DeleteSheet {
	const requestDataWipe = useMutation(api.users.requestDataWipe);
	const requestDeletion = useMutation(api.users.requestDeletion);
	const { signOut, userId } = useAuth();
	const { isPlus } = usePlusEntitlement();
	const deletionRequested = useRef(false);
	const [busy, setBusy] = useState(false);

	const deleteData = async () => {
		await requestDataWipe();
		await onDataWiped();
		router.back();
	};

	const deleteAccount = async () => {
		// A previous attempt may have deleted and then failed at sign-out;
		// re-running would throw account_inactive from requireAuth.
		if (!deletionRequested.current) {
			await requestDeletion();
			deletionRequested.current = true;
			// Coming back before Clerk's copy is gone is this same id, and these flags
			// shouldn't outlive the account they were asked on.
			if (userId) {
				useAppStore.getState().clearAccountFlags(userId);
			}
		}
		// The patch invalidates every requireAuth-gated subscription, so the
		// session must go. A failure lands in the toast below.
		await signOut();
	};

	const confirm = async () => {
		setBusy(true);
		try {
			await (kind === "data" ? deleteData() : deleteAccount());
			toast(DELETE_COPY.sheets[kind].done);
		} catch {
			// The sheet stays up, so it can be tried again or kept.
			toast(DELETE_COPY.failed.title, {
				description: DELETE_COPY.failed.description,
				variant: "danger",
			});
		} finally {
			setBusy(false);
		}
	};

	return {
		actions: {
			confirm: () => {
				if (!busy) {
					confirm().catch(() => undefined);
				}
			},
			keep: () => router.back(),
		},
		state: { busy, kind, plus: isPlus },
	};
}
