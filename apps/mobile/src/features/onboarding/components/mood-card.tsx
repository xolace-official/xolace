import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { AppText } from '@/src/components/shared/app-text';

const CARD_WIDTH_RATIO = 0.55;

/**
 * Compute the card width from the provided screen width.
 *
 * @returns The card width in pixels, calculated as `screenWidth * CARD_WIDTH_RATIO`.
 */
export function getCardWidth(screenWidth: number) {
  return screenWidth * CARD_WIDTH_RATIO;
}

export interface MoodItem {
  id: number;
  word: string;
  colors: [string, string, string];
  image?: ReturnType<typeof require>;
}

type Props = {
  item: MoodItem;
  index: number;
  scrollOffsetX: SharedValue<number>;
  allItemsWidth: number;
  cardWidth: number;
  screenWidth: number;
};

const GRADIENT_IMAGE_START = { x: 0, y: 0.4 };
const GRADIENT_IMAGE_END = { x: 0, y: 1 };
const GRADIENT_PLAIN_START = { x: 0, y: 0 };
const GRADIENT_PLAIN_END = { x: 1, y: 1 };
 
const GRADIENT_IMAGE_COLORS: [string, string] = ['transparent', 'rgba(0,0,0,0.55)'];

const MoodCardComponent = ({
  item,
  index,
  scrollOffsetX,
  allItemsWidth,
  cardWidth,
  screenWidth,
}: Props) => {
  const shift = (allItemsWidth - screenWidth) / 2;
  const initialLeft = index * cardWidth - shift;

  const animatedStyle = useAnimatedStyle(() => {
    const normalizedOffset =
      ((scrollOffsetX.get() % allItemsWidth) + allItemsWidth) % allItemsWidth;
    const left = ((initialLeft - normalizedOffset) % allItemsWidth) + shift;

    const rotation = interpolate(
      left,
      [0, screenWidth - cardWidth],
      [-0.4, 0.4]
    );
    const translateY = interpolate(
      left,
      [0, (screenWidth - cardWidth) / 2, screenWidth - cardWidth],
      [2, -1, 2]
    );
    const scale = interpolate(
      left,
      [0, (screenWidth - cardWidth) / 2, screenWidth - cardWidth],
      [0.95, 1, 0.95]
    );
    const opacity = interpolate(
      left,
      [-cardWidth, 0, (screenWidth - cardWidth) / 2, screenWidth - cardWidth, screenWidth],
      [0.3, 0.7, 1, 0.7, 0.3]
    );

    return {
      left,
      opacity,
      transform: [
        { rotateZ: `${rotation}deg` },
        { translateY },
        { scale },
      ],
    };
  });

   
  const cardSizeStyle = { width: cardWidth };

  return (
    <Animated.View style={[animatedStyle, styles.cardContainer, cardSizeStyle]}>
      <View style={styles.cardInner}>
        {item.image ? (
          <View style={styles.imageWrapper}>
            <Image
              source={item.image}
              style={styles.imageAbsolute}
              contentFit="cover"
            />
            <LinearGradient
              colors={GRADIENT_IMAGE_COLORS}
              start={GRADIENT_IMAGE_START}
              end={GRADIENT_IMAGE_END}
              style={styles.gradientFlex}
            >
              <AppText
                className="text-white/80 text-lg font-medium"
                style={styles.letterSpacing}
              >
                {item.word}
              </AppText>
            </LinearGradient>
          </View>
        ) : (
          <LinearGradient
            colors={item.colors}
            start={GRADIENT_PLAIN_START}
            end={GRADIENT_PLAIN_END}
            style={styles.gradientFlex}
          >
            <AppText
              className="text-white/70 text-lg font-medium"
              style={styles.letterSpacing}
            >
              {item.word}
            </AppText>
          </LinearGradient>
        )}
      </View>
    </Animated.View>
  );
};

export const MoodCard = MoodCardComponent;

const styles = StyleSheet.create({
  cardContainer: { position: 'absolute', height: '100%', padding: 6, transformOrigin: 'bottom' as const },
  cardInner: { flex: 1, borderRadius: 24, overflow: 'hidden', borderCurve: 'continuous' as const },
  imageWrapper: { flex: 1 },
  imageAbsolute: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  gradientFlex: { flex: 1, justifyContent: 'flex-end', padding: 24 },
  letterSpacing: { letterSpacing: 1 },
});
