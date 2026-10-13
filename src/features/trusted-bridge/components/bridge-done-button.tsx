import { Pressable, StyleSheet } from "react-native";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { SymbolView } from "expo-symbols";
import { EaseView } from "react-native-ease/uniwind";
import { useThemeColor } from "heroui-native";
import { AppText } from "@/src/components/shared/app-text";

// Gentle overshoot so it "lands" — a small reward for having reached out.
const EASING: [number, number, number, number] = [0.34, 1.56, 0.64, 1];
const ENTER = { type: "timing" as const, duration: 360, easing: EASING };
const FROM = { opacity: 0, scale: 0.85 };
const TO = { opacity: 1, scale: 1 };

type Props = {
  onPress: () => void;
};

/**
 * Liquid-glass "Done" pill. Appears in the draft nav only after a share has
 * actually completed — a calm, positive way out, distinct from the "Not right
 * now" dismissal below.
 */
export function BridgeDoneButton({ onPress }: Props) {
  const foreground = useThemeColor("foreground") as string;
  const glass = isLiquidGlassAvailable();
  const body = (
    <>
      <SymbolView
        name={{ ios: "checkmark", android: "check", web: "check" }}
        size={14}
        tintColor={foreground}
      />
      <AppText className="text-sm font-medium text-foreground">Done</AppText>
    </>
  );

  // Glass path: the label sits inside the glass so every touch on the pill
  // reaches it (its press swell), and nothing clips the swell.
  return (
    <EaseView initialAnimate={FROM} animate={TO} transition={ENTER}>
      <Pressable
        onPress={onPress}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Done"
        accessibilityHint="Finish and return home"
        className={glass ? undefined : "flex-row items-center gap-1.5 h-10 px-4 border-foreground/16"}
        style={glass ? undefined : styles.fallback}
      >
        {glass ? (
          <GlassView glassEffectStyle="regular" isInteractive style={styles.glass}>
            {body}
          </GlassView>
        ) : (
          body
        )}
      </Pressable>
    </EaseView>
  );
}

const styles = StyleSheet.create({
  fallback: {
    borderRadius: 20,
    borderWidth: 0.5,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  glass: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderCurve: "continuous",
    overflow: "visible",
  },
});
