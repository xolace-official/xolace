import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { useThemeColor } from "heroui-native";
import Animated, {
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { tap } from "@/src/lib/haptics";
import { AnimatedCarouselCard } from "./animated-carousel-card";
import { CarouselPaginator } from "./carousel-paginator";

// Internal tuning — not exposed as props since this component is colocated
// under discovery and used exactly once; add props back if a second caller
// needs different values.
const STACK_OFFSET = 8;
const PAGINATOR_VISIBLE_DOTS = 3;
const PAGINATOR_DOT_SIZE = 10;
const PAGINATOR_SPACING = 10;

type StackedCarouselProps<T> = {
  data: T[];
  renderCard: (item: T, index: number) => React.ReactNode;
  /** Fires on a tap-release (not a drag) over card `index`. */
  onCardPress?: (item: T, index: number) => void;
  cardWidth?: number;
  cardHeight?: number;
};

export const StackedCarousel = <T,>({
  data,
  renderCard,
  onCardPress,
  cardWidth = 280,
  cardHeight = 180,
}: StackedCarouselProps<T>) => {
  const { width: screenWidth } = useWindowDimensions();
  const cardBackground = useThemeColor("surface");
  const shadowColor = useThemeColor("foreground") + "0D";
  const dotColor = useThemeColor("foreground") + "56";

  // All children below are position:"absolute" (cards, the invisible
  // scroll-driver FlatList, the paginator), so Yoga gives the container zero
  // intrinsic height on its own — without this it collapses to just its
  // padding and the animated cards bleed into whatever sits above/below it
  // in the page. Sized tight to the resting card + paginator row (20pt dots
  // + 10pt breathing room); overflow is clipped below, so the brief
  // scale-1.15 "exiting" card extreme during a swipe crops cleanly against
  // this box instead of needing headroom kept empty at rest just to fit a
  // transient animation peak.
  const carouselHeight = cardHeight + 40;

  const scrollX = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.set(event.contentOffset.x);
    },
  });

  const currentPageIndex = useDerivedValue(() => {
    return scrollX.get() / cardWidth;
  });

  useAnimatedReaction(
    () => Math.round(currentPageIndex.get()),
    (curr, prev) => {
      if (curr !== prev && prev !== null) {
        scheduleOnRN(tap);
      }
    },
  );

  return (
    <View style={[styles.container, { height: carouselHeight }]}>
      {data.map((item, index) => (
        <AnimatedCarouselCard
          // eslint-disable-next-line react/no-array-index-key -- generic T carries no id; card position is the identity
          key={index}
          index={index}
          scrollX={scrollX}
          cardWidth={cardWidth}
          cardHeight={cardHeight}
          totalCards={data.length}
          cardBackground={cardBackground}
          shadowColor={shadowColor}
        >
          {renderCard(item, index)}
        </AnimatedCarouselCard>
      ))}

      {/* Invisible horizontal list positioned over the cards — the sole
          touch target. It drives scroll AND tap-through (card visuals above
          it are pointerEvents:none, so onCardPress lives here). */}
      <Animated.FlatList
        data={data}
        renderItem={({ item, index }) => (
          <Pressable
            onPress={onCardPress ? () => onCardPress(item, index) : undefined}
            style={{ width: cardWidth, height: cardHeight }}
          />
        )}
        snapToInterval={cardWidth}
        horizontal
        disableIntervalMomentum
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        decelerationRate="fast"
        style={[
          styles.scrollDriver,
          { width: screenWidth, height: cardHeight + STACK_OFFSET * 6 },
        ]}
        contentContainerStyle={{
          // Symmetric padding — without a matching paddingRight, the content
          // ends flush with the last card and scroll runs out `paddingLeft`
          // short of the offset needed to center it.
          paddingLeft: (screenWidth - cardWidth) / 2,
          paddingRight: (screenWidth - cardWidth) / 2,
          paddingTop: STACK_OFFSET * 3,
        }}
      />

      <View
        style={[styles.paginatorWrap, { width: screenWidth, top: cardHeight }]}
      >
        <CarouselPaginator
          pagesAmount={data.length}
          currentPageIndex={currentPageIndex}
          visibleDots={PAGINATOR_VISIBLE_DOTS}
          dotSize={PAGINATOR_DOT_SIZE}
          spacing={PAGINATOR_SPACING}
          dotColor={dotColor}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    // flex-start (not "center"): cards have no explicit top/bottom inset, so
    // Yoga's static position for them is derived from this. "center" was
    // vertically centering the resting card across the *full* carouselHeight
    // (card + paginator tail combined), pulling its bottom edge down into the
    // paginator's pinned region and letting the card's higher zIndex paint
    // over the dots. flex-start pins the card flush to the top so the tail
    // below it is exactly `carouselHeight - cardHeight`, matching the gap
    // the paginator math assumes.
    justifyContent: "flex-start",
    overflow: "hidden",
  },
  scrollDriver: {
    position: "absolute",
    zIndex: 1000,
  },
  paginatorWrap: {
    position: "absolute",
    bottom: 0,
  },
});
