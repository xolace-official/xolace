import { View } from 'react-native';
import { PressableFeedback, useThemeColor } from 'heroui-native';
import { SymbolView } from 'expo-symbols';
import { AppText } from '@/src/components/shared/app-text';
import { playSoftPress } from '@/src/lib/haptics';

// Empty stars are the same glyph washed out, not an outline — an outlined
// star next to filled ones reads as a rating scale, which is what it is.
const FILLED = { ios: 'star.fill', android: 'star', web: 'star' } as const;
const VALUES = [1, 2, 3, 4, 5];

/**
 * Stars use the `warning` token rather than a new `--star` one: it's already
 * the amber every theme defines, and adding a token to eleven theme files for
 * one component is not worth the drift risk.
 */
function useStarColors() {
  // useThemeColor resolves oklch tokens to 6-digit hex, so appending an alpha
  // pair is a valid colour — that's how the empty star gets its wash.
  const muted = useThemeColor('muted') as string;
  return { on: useThemeColor('warning') as string, off: `${muted}30` };
}

/**
 * Read-only rating for roster rows. Renders nothing without an average — the
 * 5-rating display threshold is enforced server-side, so an absent `rating`
 * means "not enough yet" and the caller shows a "New xolacer" chip instead.
 * A row of grey stars would read as a bad score, which is the opposite of true.
 */
export function RatingStars({
  rating,
  ratingCount,
}: {
  rating?: number;
  ratingCount: number;
}) {
  const { on, off } = useStarColors();
  if (rating === undefined) return null;

  return (
    <View
      className="flex-row items-center gap-1"
      accessibilityRole="text"
      accessibilityLabel={`Rated ${rating.toFixed(1)} out of 5 across ${ratingCount} conversations`}
    >
      <View className="flex-row gap-px">
        {VALUES.map((star) => (
          <SymbolView
            key={star}
            name={FILLED}
            size={10}
            tintColor={star <= Math.round(rating) ? on : off}
          />
        ))}
      </View>
      <AppText className="text-[11px] font-semibold tabular-nums text-foreground">
        {rating.toFixed(1)}
      </AppText>
    </View>
  );
}

/** The five-star picker on the rating prompt. */
export function RatingPicker({
  value,
  onSelect,
}: {
  value?: number;
  onSelect: (rating: number) => void;
}) {
  const { on, off } = useStarColors();

  return (
    <View className="flex-row justify-center gap-2.5">
      {VALUES.map((star) => {
        const filled = value !== undefined && star <= value;
        return (
          <PressableFeedback
            key={star}
            onPress={() => {
              playSoftPress();
              onSelect(star);
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Rate ${star} out of 5`}
            accessibilityState={{ selected: filled }}
          >
            <SymbolView name={FILLED} size={32} tintColor={filled ? on : off} />
          </PressableFeedback>
        );
      })}
    </View>
  );
}

/** Placeholder where the stars go before a xolacer has five ratings. */
export function NewXolacerChip() {
  return (
    <View className="rounded-full bg-surface-tertiary px-2 py-0.5">
      <AppText className="text-[10px] font-semibold uppercase tracking-wide text-muted">
        New Xolacer
      </AppText>
    </View>
  );
}
