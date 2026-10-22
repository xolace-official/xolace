import { useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { Image } from "expo-image";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { BottomSheet, PressableFeedback } from "heroui-native";
import { SymbolView } from "expo-symbols";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { BottomSheetBlurOverlay } from "@/src/components/bottom-sheet-blur-overlay";
import { AppText } from "@/src/components/shared/app-text";
import { cn } from "@/src/lib/utils";
import { useTokenColor } from "../hooks/use-token-color";
import { resolveAvatar, type AvatarOption } from "../hooks/use-avatars";
import { usePaywall } from "@/src/features/purchases/use-paywall";
import { usePlusEntitlement } from "@/src/features/purchases/use-plus-entitlement";

type Props = {
  isOpen: boolean;
  avatars: AvatarOption[] | undefined;
  currentKey: string | null;
  onClose: () => void;
};

const PREVIEW = 140;
const THUMB = 60;

// Carousel swap feel (ported from the source ChooseProfilePicture flow):
// the current avatar shrinks and slides out toward the travel direction, then
// the incoming avatar enters from the opposite side and springs back to center.
const DIP_SCALE = 0.55;
const SLIDE_OUT_MS = 150;
const SPRING = { damping: 18, stiffness: 150, mass: 1 } as const;



// Inner content is remounted on each open (keyed by currentKey in the parent),
// so the local draft selection always starts from the user's current avatar.
function AvatarPickerContent({
  avatars,
  currentKey,
  onClose,
}: {
  avatars: AvatarOption[];
  currentKey: string | null;
  onClose: () => void;
}) {
  const { width } = useWindowDimensions();
  const accent = useTokenColor("accent");
  const muted = useTokenColor("muted");
  const setAvatar = useMutation(api.avatars.setAvatar);
  const { isPlus } = usePlusEntitlement();
  const openPaywall = usePaywall((s) => s.open);

  const initial = resolveAvatar(avatars, currentKey);
  const [selectedKey, setSelectedKey] = useState(
    initial?.key ?? avatars[0].key,
  );
  const [animating, setAnimating] = useState(false);

  const selected = resolveAvatar(avatars, selectedKey) ?? avatars[0];
  const changed = selectedKey !== (initial?.key ?? null);

  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);

  const previewStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.get() }, { scale: scale.get() }],
  }));

  const accentSoftStyle = { backgroundColor: `${accent}14` };

  function handleSelect(key: string) {
    if (key === selectedKey || animating) return;
    const fromIdx = avatars.findIndex((a) => a.key === selectedKey);
    const toIdx = avatars.findIndex((a) => a.key === key);
    const direction = toIdx > fromIdx ? 1 : -1;

    setAnimating(true);

    // Phase 1: shrink + slide the current avatar out toward the travel direction.
    translateX.set(
      withTiming(-direction * width * 0.32, { duration: SLIDE_OUT_MS }),
    );
    scale.set(
      withTiming(DIP_SCALE, { duration: SLIDE_OUT_MS }, (finished) => {
        "worklet";
        if (!finished) return;
        // Phase 2: swap the image, drop the incoming one in on the far side,
        // then spring it back to center at full scale.
        scheduleOnRN(setSelectedKey, key);
        translateX.set(direction * width * 0.4);
        translateX.set(withSpring(0, SPRING));
        scale.set(
          withSpring(1, SPRING, (done) => {
            "worklet";
            if (done) scheduleOnRN(setAnimating, false);
          }),
        );
      }),
    );
  }

  async function handleSave() {
    if (changed) {
      try {
        await setAvatar({ key: selectedKey });
      } catch {
        // Server rejected (e.g. premium gate). Close without changing.
      }
    }
    onClose();
  }

  return (
    <View className="px-6 pt-2 pb-10">
      <AppText className="font-serif text-xl text-foreground text-center">
        Choose your face by the fire
      </AppText>
      <AppText className="text-sm font-light text-default-soft text-center mt-1.5 leading-6">
        Pick the one that feels like you today.
      </AppText>

      {/* Large preview — current avatar slides out and the new one springs in. */}
      <View className="items-center mt-6 mb-7 overflow-hidden">
        <Animated.View
          style={[previewStyle, styles.previewFrame, accentSoftStyle]}
        >
          <Image
            source={{ uri: selected.url }}
            style={styles.previewImage}
            recyclingKey={selected.key}
            cachePolicy="memory-disk"
            contentFit="cover"
            transition={120}
          />
        </Animated.View>
        <AppText className="text-[13px] text-muted mt-3">
          {selected.label}
        </AppText>
      </View>

      {/* Thumbnail grid. */}
      <View className="flex-row flex-wrap justify-center gap-4">
        {avatars.map((a) => {
          const isSelected = a.key === selectedKey;
          const locked = a.tier === "premium" && !isPlus;
          return (
            <PressableFeedback
              key={a.key}
              onPress={() => {
                if (!locked) {
                  handleSelect(a.key);
                  return;
                }
                // Close the picker first — two stacked bottom sheets fight
                // over gestures — then surface the paywall.
                onClose();
                openPaywall("premium_avatar");
              }}
              accessibilityRole="button"
              accessibilityLabel={a.label}
              accessibilityState={{ selected: isSelected }}
              className={cn(
                "rounded-full p-0.75 border-2",
                isSelected ? "border-accent" : "border-border",
              )}
            >
              <View
                style={[styles.thumbFrame, accentSoftStyle]}
                className={locked ? "opacity-40" : "opacity-100"}
              >
                <Image
                  source={{ uri: a.url }}
                  style={styles.thumbImage}
                  recyclingKey={a.key}
                  cachePolicy="memory-disk"
                  contentFit="cover"
                />
              </View>
              {locked && (
                <View className="absolute inset-0 items-center justify-center">
                  <SymbolView name={{ ios: "lock.fill", android: "lock", web: "lock" }} size={16} tintColor={muted} />
                </View>
              )}
            </PressableFeedback>
          );
        })}
      </View>

      <PressableFeedback
        onPress={handleSave}
        accessibilityRole="button"
        accessibilityLabel="Save avatar"
        className="mt-8 h-14 rounded-2xl items-center justify-center bg-accent"
      >
        <AppText className="text-base font-medium text-accent-foreground">
          {changed ? "Save" : "Done"}
        </AppText>
      </PressableFeedback>
    </View>
  );
}

export function AvatarPickerSheet({
  isOpen,
  avatars,
  currentKey,
  onClose,
}: Props) {
  const ready = avatars && avatars.length > 0;

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
          accessible={false}
          enableDynamicSizing
          enableOverDrag={false}
          backgroundClassName="bg-background"
          handleIndicatorClassName="bg-foreground/20"
        >
          {isOpen && ready ? (
            <AvatarPickerContent
              // Remount per open so the draft resets to the live selection.
              key={currentKey ?? "default"}
              avatars={avatars}
              currentKey={currentKey}
              onClose={onClose}
            />
          ) : (
            <View
              className="px-6 pt-2 pb-10 items-center justify-center"
              style={styles.loadingState}
            >
              <AppText className="text-sm text-muted">Loading avatars…</AppText>
            </View>
          )}
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}


const styles = StyleSheet.create({
  previewFrame: {
    width: PREVIEW,
    height: PREVIEW,
    borderRadius: PREVIEW / 2,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  previewImage: {
    width: PREVIEW,
    height: PREVIEW,
  },
  thumbFrame: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  thumbImage: {
    width: THUMB,
    height: THUMB,
  },
  loadingState: {
    minHeight: 200,
  },
});