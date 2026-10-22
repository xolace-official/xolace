import { Pressable, StyleSheet } from "react-native";
import Animated, {
  SharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { SymbolView } from "expo-symbols";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useThemeColor } from "heroui-native";
import { Presets } from "react-native-pulsar";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const GLASS = isLiquidGlassAvailable();

type Props = {
  isOpen: SharedValue<boolean>;
  isOpenJS: boolean;
  onPress: () => void;
};

export const MenuTrigger = ({ isOpen, isOpenJS, onPress }: Props) => {
  const foregroundColor = useThemeColor("foreground") as string;

  // With glass the dim moves to the icon: an animated opacity above the glass stops its blur rendering.
  const rStyle = useAnimatedStyle(() => ({
    opacity: GLASS ? 1 : withTiming(isOpen.get() ? 0.5 : 1),
    transform: [{ scale: withTiming(isOpen.get() ? 0.6 : 1) }],
  }));
  const iconStyle = useAnimatedStyle(() => ({
    opacity: GLASS ? withTiming(isOpen.get() ? 0.5 : 1) : 1,
  }));

  const icon = (
    <Animated.View style={iconStyle}>
      <SymbolView
        name={{ ios: "line.3.horizontal", android: "menu" } as any}
        size={22}
        tintColor={foregroundColor}
      />
    </Animated.View>
  );

  return (
    <AnimatedPressable
      onPress={() => {
        if (isOpenJS) {
          Presets.flick();
        } else {
          Presets.thud();
        }
        onPress();
      }}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={isOpenJS ? "Close menu" : "Open menu"}
      accessibilityHint={
        isOpenJS
          ? "Closes navigation options"
          : "Opens navigation options: Discovery, Vent, Settings"
      }
      className={GLASS ? undefined : "border-foreground/16"}
      style={[GLASS ? undefined : styles.fallback, rStyle]}
    >
      {/* Icon inside the glass so every touch on the circle reaches it (its press swell). */}
      {GLASS ? (
        <GlassView glassEffectStyle="regular" isInteractive style={styles.glass}>
          {icon}
        </GlassView>
      ) : (
        icon
      )}
    </AnimatedPressable>
  );
};

const shape = {
  height: 52,
  width: 52,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 26,
  borderCurve: "continuous",
} as const;

const styles = StyleSheet.create({
  fallback: { ...shape, borderWidth: 0.5, overflow: "hidden" },
  glass: { ...shape, overflow: "visible" },
});
