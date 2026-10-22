import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheet, PressableFeedback } from "heroui-native";
import { Image } from "expo-image";

import { BottomSheetBlurOverlay } from "@/src/components/bottom-sheet-blur-overlay";
import { AppText } from "@/src/components/shared/app-text";
import {
  RETURN_WELCOME,
  type ReturnWelcomeTier,
} from "@/src/features/reflect/return-welcome-copy";

const MASCOT = require("@/assets/images/flux/flux-point-down-removebg-preview.png");

type Props = {
  isOpen: boolean;
  tier: ReturnWelcomeTier;
  onClose: () => void;
};

/**
 * Detached, no-guilt greeting for a lapsed user's first reopen. The mascot
 * points down toward the copy — a hand reaching back toward the fire. Copy
 * varies by how long they've been away (see return-welcome-copy.ts). Dismissed
 * by the CTA or by tapping the blurred backdrop; there is no wrong way to close.
 */
export const ReturnWelcomeSheet = ({ isOpen, tier, onClose }: Props) => {
  const insets = useSafeAreaInsets();
  const copy = RETURN_WELCOME[tier];

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
          <View className="items-center px-6 pb-7 pt-1">
            <Image
              source={MASCOT}
              contentFit="contain"
              style={styles.mascot}
              accessibilityLabel="Flux, the Xolace companion, leaning in toward you"
            />
            <BottomSheet.Title className="mt-1 text-center font-serif text-2xl text-foreground">
              {copy.title}
            </BottomSheet.Title>
            <BottomSheet.Description className="mt-3 text-center text-[15px] leading-6 text-foreground/65">
              {copy.body}
            </BottomSheet.Description>

            <PressableFeedback
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={copy.cta}
              className="mt-7 h-13 w-full items-center justify-center rounded-2xl bg-accent"
            >
              <AppText className="text-base font-[Poppins-Medium] text-accent-foreground">
                {copy.cta}
              </AppText>
            </PressableFeedback>
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  mascot: { width: 180, height: 150 },
});
