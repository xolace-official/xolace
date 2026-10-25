import type { ToastManager } from "heroui-native";
import { useCallback, useState } from "react";

type ConfirmAction = "logout" | "deleteData" | "deleteAccount" | null;

const CONFIRM_CONFIG = {
	deleteAccount: {
		confirmLabel: "Delete account",
		description:
			"You will be signed out immediately. Your account and all associated data will be permanently deleted within the next hour. This action cannot be undone.",
		isDestructive: true,
		showLoading: true,
		title: "Delete account",
	},
	deleteData: {
		confirmLabel: "Delete everything",
		description:
			"This will permanently erase all your sessions, reflections, and emotional history. Your account and preferences will be kept. This action cannot be undone.",
		isDestructive: true,
		showLoading: true,
		title: "Delete all my data",
	},
	logout: {
		confirmLabel: "Log out",
		description: "Are you sure you want to log out?",
		isDestructive: true,
		showLoading: false,
		title: "Log out",
	},
} as const;

type UseConfirmActionParams = {
	performLogout: () => Promise<void>;
	performDeleteData: () => Promise<void>;
	performDeleteAccount: () => Promise<void>;
	toast: ToastManager;
};

export const useConfirmAction = ({
	performLogout,
	performDeleteData,
	performDeleteAccount,
	toast,
}: UseConfirmActionParams) => {
	const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
	const [isConfirmLoading, setIsConfirmLoading] = useState(false);

	const handleConfirm = useCallback(async () => {
		if (!confirmAction) {
			return;
		}

		const actions: Record<NonNullable<ConfirmAction>, () => Promise<void>> = {
			deleteAccount: performDeleteAccount,
			deleteData: performDeleteData,
			logout: performLogout,
		};

		const config = CONFIRM_CONFIG[confirmAction];

		try {
			if (config.showLoading) {
				setIsConfirmLoading(true);
			}
			await actions[confirmAction]();
		} catch {
			toast.show({
				description: "Please try again.",
				label: "Something went wrong",
				variant: "danger",
			});
		} finally {
			setIsConfirmLoading(false);
			setConfirmAction(null);
		}
	}, [
		confirmAction,
		performLogout,
		performDeleteData,
		performDeleteAccount,
		toast,
	]);

	const activeConfig = confirmAction ? CONFIRM_CONFIG[confirmAction] : null;

	return {
		activeConfig,
		confirmAction,
		handleConfirm,
		isConfirmLoading,
		setConfirmAction,
	};
};
