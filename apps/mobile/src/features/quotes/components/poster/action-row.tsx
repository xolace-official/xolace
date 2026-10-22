import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { PressableFeedback } from "heroui-native";
import { SymbolView } from "expo-symbols";
import { useCSSVariable } from "uniwind";
import { Presets } from "react-native-pulsar";
import { AppText } from "@/src/components/shared/app-text";

const SHARE_ICON = { ios: "square.and.arrow.up", android: "share" } as const;
const SHARING_ICON = { ios: "arrow.2.circlepath", android: "refresh" } as const;
const HEART_ICON = { ios: "heart", android: "favorite_border" } as const;
const HEART_ON_ICON = { ios: "heart.fill", android: "favorite" } as const;
const SPRING = { damping: 18, stiffness: 160, mass: 0.9 };


export function ActionRow({
  resonates,
  isSharingLoading,
  onShare,
  onReact,
}: {
  resonates: boolean;
  isSharingLoading?: boolean;
  onShare: () => void;
  onReact: (next: "resonates" | null) => void;
}) {
  const [ink, inkDeep, white, shadow] = useCSSVariable([
    "--color-poster-ink",
    "--color-poster-ink-deep",
    "--color-poster-plate",
    "--color-poster-shadow",
  ]) as string[];

  // the pill answers the tap itself; the full-screen burst is the screen's
  const pop = useSharedValue(1);
  const isFirst = useSharedValue(true);
  useEffect(() => {
    if (isFirst.get()) {
      isFirst.set(false);
      return;
    }
    pop.set(
      withSequence(withTiming(1.06, { duration: 130 }), withSpring(1, SPRING)),
    );
  }, [resonates, pop, isFirst]);
  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.get() }],
  }));

  const shadowStyle = { shadowColor: shadow };

  return (
    <View className="mt-4.5 flex-row gap-3">
      <PressableFeedback
        onPress={onShare}
        isDisabled={!!isSharingLoading}
        accessibilityRole="button"
        accessibilityLabel="Share"
        style={styles.share}

      >
        <View
          className="h-13 flex-row items-center justify-center gap-2.5 rounded-[14px] bg-poster-plate"
          style={[styles.pill, shadowStyle]}
        >
          <AppText className="text-[15px] font-semibold text-poster-ink">
            Share
          </AppText>
          <SymbolView
            name={isSharingLoading ? SHARING_ICON : SHARE_ICON}
            size={16}
            tintColor={ink}
          />
        </View>
      </PressableFeedback>

      <Animated.View style={[styles.resonate, popStyle]}>
        <PressableFeedback
          onPress={() => {
            Presets.chirp();
            onReact(resonates ? null : "resonates");
          }}
          accessibilityRole="button"
          accessibilityLabel="Resonate"
          accessibilityState={{ selected: resonates }}
        >
          <View
            className="h-13 flex-row items-center justify-center gap-2.5 rounded-[14px] bg-poster-resonate"
            style={[styles.pill, shadowStyle]}
          >
            <AppText
              className="text-[15px] font-semibold"
              style={{ color: resonates ? white : inkDeep }}
            >
              Resonate
            </AppText>
            <SymbolView
              name={resonates ? HEART_ON_ICON : HEART_ICON}
              size={18}
              tintColor={resonates ? white : inkDeep}
            />
          </View>
        </PressableFeedback>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  share: { flex: 1 },
  /* the design gives Resonate the wider half of the row */
  resonate: { flex: 1.15 },
  pill: {
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
});
