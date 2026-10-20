// PROTOTYPE (#586) — throwaway. "Start a talk" as a top-right toolbar button
// on Reflect home, left of the crisis button in its own glass bubble. The
// yellow chip cycles who is tapping it; the button, dialogs and chip all go
// with the prototype.
import { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Button, Dialog } from "heroui-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DialogBlurBackdrop } from "@/src/components/dialog-blur-backdrop";
import { AppText } from "@/src/components/shared/app-text";
import { usePaywall, type PaywallSurface } from "@/src/features/purchases/use-paywall";
import { COMPANION_NAME } from "@/src/features/talk/talk-copy";

const DOOR_STATES = {
  plus: "Plus · time left",
  freeDoor: "Free · Plus door",
  freeHidden: "Free · no button",
  capped: "Plus · week used",
} as const;
type DoorState = keyof typeof DOOR_STATES;
const KEYS = Object.keys(DOOR_STATES) as DoorState[];

export function useTalkDoor() {
  const [state, setState] = useState<DoorState>("plus");
  const [dialog, setDialog] = useState<"free" | "capped" | null>(null);
  const openPaywall = usePaywall((s) => s.open);
  return {
    state,
    label: DOOR_STATES[state],
    visible: state !== "freeHidden",
    cycle: () => setState(KEYS[(KEYS.indexOf(state) + 1) % KEYS.length]),
    onPress: () => {
      if (state === "plus") router.push("/talk");
      else setDialog(state === "capped" ? "capped" : "free");
    },
    dialog,
    closeDialog: () => setDialog(null),
    upgrade: () => {
      setDialog(null);
      openPaywall("talk_door" as PaywallSurface);
    },
  };
}
export type TalkDoor = ReturnType<typeof useTalkDoor>;

export function TalkDoorDialog({ door }: { door: TalkDoor }) {
  const free = door.dialog === "free";
  return (
    <Dialog isOpen={door.dialog !== null} onOpenChange={(open) => !open && door.closeDialog()}>
      <Dialog.Portal>
        <DialogBlurBackdrop />
        <Dialog.Content className="max-w-sm mx-auto">
          <View className="mb-5 gap-1.5">
            <Dialog.Title>{free ? `Talk it through with ${COMPANION_NAME}` : "This week's talk time is used"}</Dialog.Title>
            <Dialog.Description>
              <AppText className="text-sm text-foreground/60">
                {free
                  ? `Speak or type with ${COMPANION_NAME}, out loud and back and forth. When you finish, the whole talk becomes your mirror. Talks are part of Xolace+.`
                  : "Talk time resets Monday. You can still write a reflection here any time."}
              </AppText>
            </Dialog.Description>
          </View>
          <View className="flex-row justify-end gap-3">
            <Button variant="ghost" size="sm" onPress={door.closeDialog}>
              {free ? "Not now" : "OK"}
            </Button>
            {free && (
              <Button variant="primary" size="sm" onPress={door.upgrade}>
                Upgrade to Xolace+
              </Button>
            )}
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}

/** Loud dev chip so nobody mistakes it for the design. */
export function TalkDoorChip({ door }: { door: TalkDoor }) {
  const insets = useSafeAreaInsets();
  if (process.env.NODE_ENV === "production") return null;
  return (
    <View
      pointerEvents="box-none"
      style={{ position: "absolute", top: insets.top + 56, left: 0, right: 0, alignItems: "center" }}
    >
      <Pressable
        onPress={door.cycle}
        hitSlop={6}
        className="rounded-full border border-yellow-300 bg-yellow-400/90 px-3 py-1.5"
      >
        <AppText className="text-xs font-bold text-black">talk door: {door.label} ▶</AppText>
      </Pressable>
    </View>
  );
}
