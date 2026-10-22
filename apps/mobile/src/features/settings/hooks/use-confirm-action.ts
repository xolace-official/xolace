import { useState, useCallback } from "react";
import type { ToastManager } from "heroui-native";

type ConfirmAction = "logout" | "deleteData" | "deleteAccount" | null;

const CONFIRM_CONFIG = {
  logout: {
    title: "Log out",
    description: "Are you sure you want to log out?",
    confirmLabel: "Log out",
    isDestructive: true,
    showLoading: false,
  },
  deleteData: {
    title: "Delete all my data",
    description:
      "This will permanently erase all your sessions, reflections, and emotional history. Your account and preferences will be kept. This action cannot be undone.",
    confirmLabel: "Delete everything",
    isDestructive: true,
    showLoading: true,
  },
  deleteAccount: {
    title: "Delete account",
    description:
      "You will be signed out immediately. Your account and all associated data will be permanently deleted within the next hour. This action cannot be undone.",
    confirmLabel: "Delete account",
    isDestructive: true,
    showLoading: true,
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
    if (!confirmAction) return;

    const actions: Record<NonNullable<ConfirmAction>, () => Promise<void>> = {
      logout: performLogout,
      deleteData: performDeleteData,
      deleteAccount: performDeleteAccount,
    };

    const config = CONFIRM_CONFIG[confirmAction];

    try {
      if (config.showLoading) {
        setIsConfirmLoading(true);
      }
      await actions[confirmAction]();
    } catch {
      toast.show({
        variant: "danger",
        label: "Something went wrong",
        description: "Please try again.",
      });
    } finally {
      setIsConfirmLoading(false);
      setConfirmAction(null);
    }
  }, [confirmAction, performLogout, performDeleteData, performDeleteAccount, toast]);

  const activeConfig = confirmAction ? CONFIRM_CONFIG[confirmAction] : null;

  return {
    confirmAction,
    setConfirmAction,
    isConfirmLoading,
    activeConfig,
    handleConfirm,
  };
};
