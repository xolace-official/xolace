// The talk door on Reflect home (#586, #594): Plus goes to the talk screen,
// free sees the same button as a Plus door. The server fence is
// requirePremium in talk.session.start.
import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Button, Dialog } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { DialogBlurBackdrop } from "@/src/components/dialog-blur-backdrop";
import { AppText } from "@/src/components/shared/app-text";
import { usePaywall } from "@/src/features/purchases/use-paywall";
import { usePlusEntitlement } from "@/src/features/purchases/use-plus-entitlement";
import { COMPANION_NAME } from "@/src/features/talk/talk-copy";

export function useTalkDoor() {
  const { isPlus, isResolved } = usePlusEntitlement();
  const [isOpen, setIsOpen] = useState(false);
  const openPaywall = usePaywall((s) => s.open);
  const posthog = usePostHog();
  return {
    onPress: () => {
      // `isPlus` reads false while loading: don't upsell a Plus person who tapped early.
      if (isPlus) router.push("/talk");
      else if (isResolved) {
        posthog.capture("plus_upsell_shown", { surface: "talk_door" });
        setIsOpen(true);
      }
    },
    isOpen,
    close: () => setIsOpen(false),
    upgrade: () => {
      setIsOpen(false);
      posthog.capture("plus_upsell_tapped", { surface: "talk_door" });
      openPaywall("talk_door");
    },
  };
}
export type TalkDoor = ReturnType<typeof useTalkDoor>;

export function TalkDoorDialog({ door }: { door: TalkDoor }) {
  return (
    <Dialog isOpen={door.isOpen} onOpenChange={(open) => !open && door.close()}>
      <Dialog.Portal>
        <DialogBlurBackdrop />
        <Dialog.Content className="max-w-sm mx-auto">
          <View className="mb-5 gap-1.5">
            <Dialog.Title>{`Talk it through with ${COMPANION_NAME}`}</Dialog.Title>
            <Dialog.Description>
              <AppText className="text-sm text-foreground/60">
                {`Speak or type with ${COMPANION_NAME}, out loud and back and forth. When you finish, the whole talk becomes your mirror. Talks are part of Xolace+.`}
              </AppText>
            </Dialog.Description>
          </View>
          <View className="flex-row justify-end gap-3">
            <Button variant="ghost" size="sm" onPress={door.close}>
              Not now
            </Button>
            <Button variant="primary" size="sm" onPress={door.upgrade}>
              Upgrade to Xolace+
            </Button>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
