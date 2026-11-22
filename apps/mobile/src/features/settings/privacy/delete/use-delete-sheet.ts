import { useAuth } from "@clerk/expo";
import { api } from "@xolace/backend/api";
import { useMutation } from "convex/react";
import { router, useNavigation } from "expo-router";
import { useEffect, useState } from "react";
import { toast } from "@/components/shared/toast";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import { DELETE_COPY, type SheetKind } from "@/features/settings/privacy/copy";
import type { DeleteSheet } from "@/features/settings/privacy/delete/delete-sheet-data";
import { deletionAlreadyRequested } from "@/features/settings/privacy/privacy-model";
import { convexErrorCode } from "@/lib/convex-error-code";
import { useSingleFlight } from "@/lib/use-single-flight";
import { useAppStore } from "@/store/store";

export function useDeleteSheet(
	kind: SheetKind,
	onDataWiped: () => Promise<void>
): DeleteSheet {
	const requestDataWipe = useMutation(api.users.requestDataWipe);
	const requestDeletion = useMutation(api.users.requestDeletion);
	const { signOut, userId } = useAuth();
	const { status } = usePlusEntitlement();
	const navigation = useNavigation();
	const flight = useSingleFlight();
	const [deleted, setDeleted] = useState(false);
	const locked = flight.busy || deleted;

	useEffect(() => {
		navigation.setOptions({ gestureEnabled: !locked });
	}, [navigation, locked]);

	const deleteData = async () => {
		await requestDataWipe();
		await onDataWiped();
		if (navigation.isFocused()) {
			router.back();
		}
	};

	const deleteAccount = async () => {
		try {
			await requestDeletion();
		} catch (error) {
			if (!deletionAlreadyRequested(convexErrorCode(error))) {
				throw error;
			}
		}
		setDeleted(true);
		if (userId) {
			useAppStore.getState().clearAccountFlags(userId);
		}
		await signOut();
	};

	const confirm = async () => {
		const remove = kind === "data" ? deleteData : deleteAccount;
		try {
			await remove();
			toast(DELETE_COPY.sheets[kind].done);
		} catch {
			toast(DELETE_COPY.failed.title, {
				description: DELETE_COPY.failed.description,
				variant: "danger",
			});
		}
	};

	return {
		actions: {
			confirm: () => {
				flight.run(confirm).catch(() => undefined);
			},
			keep: () => {
				if (!locked) {
					router.back();
				}
			},
		},
		state: { busy: flight.busy, deleted, kind, plus: status },
	};
}
