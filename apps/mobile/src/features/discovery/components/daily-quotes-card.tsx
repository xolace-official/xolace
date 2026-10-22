import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { PressableFeedback } from 'heroui-native';

import { AppText } from '@/src/components/shared/app-text';
import { playSoftPress } from '@/src/lib/haptics';

// TODO(asset): placeholder — swap for the dedicated quotes illustration when it
// lands, and drop the oversize/offset trick with it.
//
// The source is a 2×2 grid of figures, so it has to be zoomed and offset to
// isolate one; `contentFit`/`contentPosition` alone only pan, they don't zoom.
// Source is 1200×1000; the bottom-left figure sits at roughly x 230–580,
// y 470–1000, and 0.40 is the scale that lands that region in a 132pt window.
//
// The crop starts at y 500, not the nominal 470 seam. The lavender blob behind
// the figure above dips to ~490 and showed as a stray arc along the card's top
// edge at anything higher — and it overlaps this figure's hair bun (~480), so
// there is no gutter that clears both. 500 clears the blob and lets the bun
// bleed off the top edge, which reads as intentional; the alternative reads as
// a rendering artifact. Goes away with the dedicated asset above.
const ART = require('@/assets/images/illustrations/discovery-image-bg.png');
const ART_SCALE = 0.4;
const ART_CROP_X = 230;
const ART_CROP_Y = 500;

// rounded-3xl, as px — the art window has to match the card's own radius.
const CARD_RADIUS = 24;

const styles = StyleSheet.create({
  card: { borderCurve: 'continuous' },
  // Android only honours `overflow: 'hidden'` on a view that has a border
  // radius — without one it never sets up the clip and the oversized art below
  // spills out past the card. Only the right corners are rounded, so the window
  // still meets the card's right edge exactly and the art reads as bleeding
  // into it; the left corners stay square and invisible mid-card.
  artWindow: {
    width: 132,
    overflow: 'hidden',
    borderTopRightRadius: CARD_RADIUS,
    borderBottomRightRadius: CARD_RADIUS,
    borderCurve: 'continuous',
  },
  art: {
    position: 'absolute',
    width: 1200 * ART_SCALE,
    height: 1000 * ART_SCALE,
    left: -ART_CROP_X * ART_SCALE,
    top: -ART_CROP_Y * ART_SCALE,
  },
});

/**
 * Entry point to the quotes screen. Deliberately fetches nothing — it names
 * where it leads rather than previewing a quote, so discovery stays a cheap
 * screen and the quote itself keeps its impact where it actually lives.
 *
 * Copy sits left, art bleeds into the card's right edge and is clipped by the
 * card radius.
 */
export function DailyQuotesCard() {
  const router = useRouter();

  const goToQuotes = () => {
    playSoftPress();
    router.push('/(protected)/quotes');
  };

  return (
    <PressableFeedback
      onPress={goToQuotes}
      accessibilityRole="button"
      accessibilityLabel="Open daily quotes"
    >
      <View
        className="flex-row items-center overflow-hidden rounded-3xl border border-border/60 bg-surface"
        style={styles.card}
      >
        <View className="flex-1 py-6 pl-5 pr-3">
          <AppText className="text-lg font-semibold text-foreground">Daily Quotes</AppText>
          <AppText className="mt-1.5 text-sm leading-5 text-muted">
            Curated lines for the day, and the ones your own sessions left behind.
          </AppText>
        </View>
        {/* Stretches to the card's height rather than carrying its own, so the
            rounded corners land on the card's corners instead of floating a
            few points inside them. */}
        <View className="self-stretch" style={styles.artWindow}>
          <Image
            source={ART}
            contentFit="cover"
            style={styles.art}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        </View>
      </View>
    </PressableFeedback>
  );
}
