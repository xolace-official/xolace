import { Platform, View, type ViewStyle } from 'react-native';
import { Canvas, Group, Image as SkiaImage, useImage } from '@shopify/react-native-skia';
import { useThemeColor } from 'heroui-native';

import { cn } from '@/src/lib/utils';

import { createFounderClipPath } from './clip-paths';
import type { FounderMarqueeCard } from './marquee-data';

// A tinted frame (plain RN view, so the colour stays a theme token) with a
// Skia-clipped photo inset. Only Skia can do the non-rectangular silhouettes.

const INSET = 14;

type Props = {
  card: FounderMarqueeCard;
  width: number;
  height: number;
  rotationDeg?: number;
};

export const FounderCard = ({ card, width, height, rotationDeg = 0 }: Props) => {
  const skImage = useImage(card.image);
  const shadowColor = useThemeColor('foreground') as string;
  const innerW = width - INSET * 2;
  const innerH = height - INSET * 2;
  const clip = createFounderClipPath(card.shape, innerW, innerH);

  const shadow: ViewStyle =
    Platform.select<ViewStyle>({
      ios: {
        shadowColor,
        shadowOffset: { width: -10, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      android: { elevation: 10 },
      default: {},
    }) ?? {};

  return (
    <View
      className={cn('rounded-3xl', card.frameClassName)}
      style={{ width, height, transform: [{ rotate: `${rotationDeg}deg` }], ...shadow }}
    >
      <Canvas style={{ width: innerW, height: innerH, marginLeft: INSET, marginTop: INSET }}>
        <Group clip={clip}>
          {skImage ? (
            <SkiaImage image={skImage} x={0} y={0} width={innerW} height={innerH} fit="cover" />
          ) : null}
        </Group>
      </Canvas>
    </View>
  );
};
