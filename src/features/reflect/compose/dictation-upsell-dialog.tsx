import { View } from "react-native";
import { Button, Dialog } from "heroui-native";
import { DialogBlurBackdrop } from "@/src/components/dialog-blur-backdrop";
import { AppText } from "@/src/components/shared/app-text";
import { playAffirmativePress, playSoftPress } from "@/src/lib/haptics";
import type { DictationUpsell } from "@/src/features/reflect/hooks/use-dictation-upsell";

/** A free person's one introduction to Plus dictation, on their first mic tap (#559). */
export const DictationUpsellDialog = ({ isOpen, onNotNow, onUpgrade, onDismiss }: DictationUpsell) => (
  <Dialog isOpen={isOpen} onOpenChange={(open) => !open && onDismiss()}>
    <Dialog.Portal>
      <DialogBlurBackdrop />
      <Dialog.Content className="max-w-sm mx-auto">
        <View className="mb-5 gap-1.5">
          <Dialog.Title>Sharper dictation</Dialog.Title>
          <Dialog.Description>
            <AppText className="text-sm text-foreground/60">
              Your phone can already write down what you say. Xolace+ catches it more
              closely: the pauses, the names, the way you actually talk. Either way,
              it&apos;s yours to edit before you send it.
            </AppText>
          </Dialog.Description>
        </View>
        <View className="flex-row justify-end gap-3">
          <Button
            variant="ghost"
            size="sm"
            onPress={() => {
              playSoftPress();
              onNotNow();
            }}
          >
            Not now
          </Button>
          <Button
            variant="primary"
            size="sm"
            onPress={() => {
              playAffirmativePress();
              onUpgrade();
            }}
          >
            Upgrade to Xolace+
          </Button>
        </View>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog>
);
