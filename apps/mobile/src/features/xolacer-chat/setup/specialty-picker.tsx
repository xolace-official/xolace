import { StyleSheet, View } from 'react-native';
import { PressableFeedback, useThemeColor } from 'heroui-native';
import { SymbolView } from 'expo-symbols';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { MAX_SPECIALTIES, SPECIALTIES } from '@/convex/lib/specialties';
import { AppText } from '@/src/components/shared/app-text';
import { playSoftPress } from '@/src/lib/haptics';

const AnimatedText = Animated.createAnimatedComponent(AppText);

const CHECK = {
  ios: 'checkmark.circle.fill',
  android: 'check_circle',
  web: 'check_circle',
} as const;

// Neighbours reflow rather than jump when a chip grows to fit its checkmark.
const LAYOUT = LinearTransition.springify().mass(1).damping(30).stiffness(250);
const EASE = Easing.bezier(0.895, 0.03, 0.685, 0.22).factory();
const CHECK_IN = FadeIn.duration(150).easing(EASE);
const CHECK_OUT = FadeOut.duration(150).easing(EASE);
const TIMING = { duration: 180 };

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: 36,
    borderWidth: 1.5,
    flexDirection: 'row',
    paddingLeft: 16,
    paddingVertical: 10,
  },
  check: { marginLeft: 8 },
});

/**
 * Fixed taxonomy, hard cap of four. Past the cap the unpicked chips dim
 * rather than disappear, so a xolacer can see what they didn't pick and swap
 * — a list that shrinks as you use it feels broken.
 */
export function SpecialtyPicker({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (slug: string) => void;
}) {
  const atCap = selected.length >= MAX_SPECIALTIES;

  return (
    <View className="gap-3 pt-4">
      <View className="flex-row items-center justify-between px-0.5">
        <AppText className="text-[11px] font-bold uppercase tracking-widest text-muted">
          What you&apos;re here for
        </AppText>
        <AppText className="text-[11px] tabular-nums text-muted">
          {selected.length} / {MAX_SPECIALTIES}
        </AppText>
      </View>

      <View className="flex-row flex-wrap gap-2.5">
        {SPECIALTIES.map((specialty) => {
          const checked = selected.includes(specialty.slug);
          return (
            <SpecialtyChip
              key={specialty.slug}
              label={specialty.pickerLabel}
              checked={checked}
              disabled={atCap && !checked}
              onPress={() => onToggle(specialty.slug)}
            />
          );
        })}
      </View>

      <AppText className="px-0.5 text-[11px] leading-4 text-muted">
        {atCap
          ? 'Four is the limit — deselect one to swap.'
          : 'Pick up to four. People can filter the roster by these.'}
      </AppText>
    </View>
  );
}

function SpecialtyChip({
  label,
  checked,
  disabled,
  onPress,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const accent = useThemeColor('accent') as string;
  const muted = useThemeColor('muted') as string;

  const rContainer = useAnimatedStyle(
    () => ({
      paddingRight: withTiming(checked ? 10 : 16, TIMING),
      borderColor: withTiming(checked ? `${accent}33` : `${muted}26`, TIMING),
      backgroundColor: withTiming(checked ? `${accent}14` : 'transparent', TIMING),
      opacity: withTiming(disabled ? 0.4 : 1, TIMING),
    })
  );

  const rLabel = useAnimatedStyle(
    () => ({ color: withTiming(checked ? accent : muted, TIMING) })
  );

  return (
    <Animated.View layout={LAYOUT}>
      <PressableFeedback
        onPress={() => {
          if (disabled) return;
          playSoftPress();
          onPress();
        }}
        isDisabled={disabled}
        accessibilityRole="checkbox"
        accessibilityLabel={label}
        accessibilityState={{ checked, disabled }}
      >
        <Animated.View style={[styles.chip, rContainer]}>
          <AnimatedText className="text-sm font-medium" style={rLabel}>
            {label}
          </AnimatedText>
          {checked && (
            <Animated.View
              style={styles.check}
              layout={LAYOUT}
              entering={CHECK_IN}
              exiting={CHECK_OUT}
            >
              <SymbolView name={CHECK} size={17} tintColor={accent} />
            </Animated.View>
          )}
        </Animated.View>
      </PressableFeedback>
    </Animated.View>
  );
}
