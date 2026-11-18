import { useAuth } from "@clerk/expo";
import { api } from "@xolace/backend/api";
import { useMutation } from "convex/react";
import { router, useNavigation } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "@/components/shared/toast";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import { DELETE_COPY, type SheetKind } from "@/features/settings/privacy/copy";
import type { DeleteSheet } from "@/features/settings/privacy/delete/delete-sheet-data";
import { deletionAlreadyRequested } from "@/features/settings/privacy/privacy-model";
import { convexErrorCode } from "@/lib/convex-error-code";
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
	const navigation = useNavigation();
	// Set synchronously, so a second tap before React re-renders can't send a second request.
	const inFlight = useRef(false);
	const [busy, setBusy] = useState(false);
	// The account is deleted and only signing out is left: Keep can't promise anything now.
	const [deleted, setDeleted] = useState(false);
	const locked = busy || deleted;

	// While a request runs (or once the account is gone) the sheet can't be swiped away.
	useEffect(() => {
		navigation.setOptions({ gestureEnabled: !locked });
	}, [navigation, locked]);

	const deleteData = async () => {
		await requestDataWipe();
		await onDataWiped();
		// Only close the sheet itself: if it was already left, pop nothing else.
		if (navigation.isFocused()) {
			router.back();
		}
	};

	const deleteAccount = async () => {
		try {
			await requestDeletion();
		} catch (error) {
			// An earlier attempt deleted it and then failed to sign out; the server is the truth.
			if (!deletionAlreadyRequested(convexErrorCode(error))) {
				throw error;
			}
		}
		setDeleted(true);
		// Coming back before Clerk's copy is gone is this same id, and these flags
		// shouldn't outlive the account they were asked on.
		if (userId) {
			useAppStore.getState().clearAccountFlags(userId);
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
			// The sheet stays up, so it can be tried again (or, before a deletion, kept).
			toast(DELETE_COPY.failed.title, {
				description: DELETE_COPY.failed.description,
				variant: "danger",
			});
		} finally {
			inFlight.current = false;
			setBusy(false);
		}
	};

	return {
		actions: {
			confirm: () => {
				if (inFlight.current) {
					return;
				}
				inFlight.current = true;
				confirm().catch(() => undefined);
			},
			keep: () => {
				if (!locked) {
					router.back();
				}
			},
		},
		state: { busy, deleted, kind, plus: isPlus },
	};
}
