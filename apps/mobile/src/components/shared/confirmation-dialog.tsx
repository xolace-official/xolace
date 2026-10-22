import { View } from "react-native";
import { Dialog, Button, Spinner, useThemeColor } from "heroui-native";
import { DialogBlurBackdrop } from "@/src/components/dialog-blur-backdrop";
import { AppText } from "@/src/components/shared/app-text";
import { playAffirmativePress, playSoftPress } from "@/src/lib/haptics";

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  isDestructive?: boolean;
  isLoading?: boolean;
};

/**
 * Reusable confirmation dialog following the same pattern as ThemePickerDialog.
 * Supports destructive styling and a loading state on the confirm button.
 */
export const ConfirmationDialog = ({
  isOpen,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  isDestructive = false,
  isLoading = false,
}: Props) => {
  const dangerFg = useThemeColor("danger-foreground") as string;

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <DialogBlurBackdrop />
        <Dialog.Content className="max-w-sm mx-auto">
          <View className="mb-5 gap-1.5">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Description>
              <AppText className="text-sm text-foreground/60">
                {description}
              </AppText>
            </Dialog.Description>
          </View>

          <View className="flex-row justify-end gap-3">
            <Button
              variant="ghost"
              size="sm"
              onPress={() => {
                playSoftPress();
                onOpenChange(false);
              }}
              isDisabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant={isDestructive ? "danger" : "primary"}
              size="sm"
              onPress={() => {
                // Backing out stays soft; committing carries weight. This is the
                // last touch before an irreversible action (wipe data, delete
                // account), and it should not feel like any other button.
                playAffirmativePress();
                onConfirm();
              }}
              isDisabled={isLoading}
            >
              {isLoading ? (
                <Spinner
                  size="sm"
                  color={isDestructive ? dangerFg : undefined}
                />
              ) : (
                confirmLabel
              )}
            </Button>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
};
