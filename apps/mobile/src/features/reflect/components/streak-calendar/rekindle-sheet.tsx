import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheet, PressableFeedback } from "heroui-native";

import { BottomSheetBlurOverlay } from "@/src/components/bottom-sheet-blur-overlay";
import { AppText } from "@/src/components/shared/app-text";

type Props = {
  isOpen: boolean;
  streak: number;
  onRekindle: () => void;
  onClose: () => void;
};

/**
 * The one ask for a revive (#437): spend a streak saver to bring back the run
 * a missed day cut. The window reads as "until tonight" — no clock, nothing
 * ticking; when it closes the offer simply isn't there any more.
 */
export const RekindleSheet = ({ isOpen, streak, onRekindle, onClose }: Props) => {
  const insets = useSafeAreaInsets();

  return (
    <BottomSheet
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <BottomSheet.Portal unstable_accessibilityContainerViewIsModal>
        <BottomSheetBlurOverlay />
        <BottomSheet.Content
          detached
          bottomInset={insets.bottom + 12}
          enableOverDrag={false}
          className="mx-4"
          backgroundClassName="rounded-[32px] bg-overlay"
          handleIndicatorClassName="opacity-0"
          accessible={false}
        >
          <View className="items-center px-6 pb-7 pt-3">
            <BottomSheet.Title className="text-center font-serif text-2xl text-foreground">
              The embers are still warm
            </BottomSheet.Title>
            <BottomSheet.Description className="mt-3 text-center text-[15px] leading-6 text-foreground/65">
              {`Your ${streak}-day streak went quiet. You can rekindle it until tonight.`}
            </BottomSheet.Description>

            <PressableFeedback
              onPress={onRekindle}
              accessibilityRole="button"
              accessibilityLabel="Use 1 streak saver"
              className="mt-7 h-13 w-full items-center justify-center rounded-2xl bg-accent"
            >
              <AppText className="text-base font-[Poppins-Medium] text-accent-foreground">
                Use 1 streak saver
              </AppText>
            </PressableFeedback>
            <PressableFeedback
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Not now"
              className="mt-2 h-12 w-full items-center justify-center rounded-2xl"
            >
              <AppText className="text-base text-foreground/65">Not now</AppText>
            </PressableFeedback>
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
};
