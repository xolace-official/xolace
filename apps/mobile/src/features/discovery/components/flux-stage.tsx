import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Blur, Canvas, Oval } from '@shopify/react-native-skia';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useThemeColor } from 'heroui-native';

// Trimmed to its alpha bounding box (492x964). The delivered cutout was
// 928x1152 with 56% empty canvas, which made him render at half his slot.
const FLUX = require('@/assets/images/flux/flux-whisper.png');

/**
 * Where his mouth sits, as a fraction of the trimmed sprite — measured on the
 * PNG (327,417 of 492x964), not eyeballed. The speech tail is placed off this.
 */
export const MOUTH_Y = 0.433;

/**
 * Eye boxes as fractions of the sprite, plus the skin tone sampled from the
 * pixels directly above each one. These are properties of the PNG, not of the
 * theme — that's why they're literals and not CSS variables. Re-measure if the
 * asset is ever regenerated.
 */
const EYES = [
  { cx: 0.457, cy: 0.355, w: 0.122, h: 0.099, skin: '#F6CE94' },
  { cx: 0.817, cy: 0.344, w: 0.085, h: 0.088, skin: '#FAC4B1' },
];

/** Headroom around the glow so its blur is never clipped by the canvas edge. */
const GLOW_PAD = 14;

const styles = StyleSheet.create({
  // He's a flame — he leans from his feet, he doesn't pivot mid-body.
  // Percentages, not keywords: transformOrigin is x-then-y, so 'bottom center'
  // is rejected outright and the sway silently pivots mid-body instead.
  sprite: { transformOrigin: '50% 100%' },
  // The lid closes downward from the top of the eye.
  lid: { position: 'absolute', transformOrigin: '50% 0%' },
  glow: { position: 'absolute', bottom: 0, height: 30 },
});

/**
 * One eyelid, closing downward. Each gets its own `useAnimatedStyle` — a single
 * animated style binds to a single view, so sharing one across both lids
 * renders neither.
 */
function Lid({
  eye,
  w,
  h,
  lid,
}: {
  eye: (typeof EYES)[number];
  w: number;
  h: number;
  lid: SharedValue<number>;
}) {
  // Slightly oversized so no sliver of eye survives the closed frame.
  const ew = eye.w * w * 1.14;
  const eh = eye.h * h * 1.12;
  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: lid.get() }] }));

  return (
    <Animated.View
      style={[
        styles.lid,
        {
          left: eye.cx * w - ew / 2,
          top: eye.cy * h - eh / 2,
          width: ew,
          height: eh,
          borderRadius: ew / 2,
          backgroundColor: eye.skin,
        },
        style,
      ]}
    />
  );
}

/**
 * Flux, standing on his own firelight.
 *
 * Three things move, none of them the sprite as a whole: a slow sway rooted at
 * his feet, an ember glow underneath that breathes in sync (this is what gives
 * him contact with the ground — the render itself floats), and a blink drawn in
 * code over his eyes. Translating or scaling a flat PNG reads as a sticker,
 * which is the one thing this can't look like.
 *
 * `reduced` freezes all three at their resting frame.
 */
export function FluxStage({
  w = 53,
  h = 104,
  reduced = false,
}: {
  w?: number;
  h?: number;
  reduced?: boolean;
}) {
  // `--ember` is a project variable, outside heroui's own key union — the cast
  // is the only reason this isn't just useThemeColor('ember').
  const ember = useThemeColor('ember' as never) as string;
  const t = useSharedValue(0);
  const lid = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      t.set(0.5);
      return;
    }
    t.set(
      withRepeat(
        withSequence(withTiming(1, { duration: 2600 }), withTiming(0, { duration: 2600 })),
        -1,
        false,
      ),
    );
  }, [t, reduced]);

  useEffect(() => {
    if (reduced) return;
    let id: ReturnType<typeof setTimeout>;
    const schedule = () => {
      // Irregular on purpose — a metronome blink is worse than none.
      id = setTimeout(
        () => {
          lid.set(
            withSequence(
              withTiming(1, { duration: 90, easing: Easing.in(Easing.quad) }),
              withTiming(0, { duration: 130, easing: Easing.out(Easing.quad) }),
            ),
          );
          schedule();
        },
        3200 + Math.random() * 3600,
      );
    };
    schedule();
    return () => clearTimeout(id);
  }, [lid, reduced]);

  const glow = useDerivedValue(() => 0.14 + t.get() * 0.13);
  const sway = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-0.9 + t.get() * 1.8}deg` }],
  }));

  return (
    <View style={{ width: w, height: h + 10 }}>
      {/* Padded well past the oval: a blur clipped to its canvas smears the
        * edge sample across the whole rect and reads as a grey box, not a glow. */}
      <Canvas style={[styles.glow, { left: -GLOW_PAD, width: w + GLOW_PAD * 2 }]} opaque={false}>
        <Oval
          x={GLOW_PAD + w * 0.06}
          y={12}
          width={w * 0.88}
          height={12}
          color={ember}
          opacity={glow}
        >
          <Blur blur={8} mode="decal" />
        </Oval>
      </Canvas>
      <Animated.View style={[{ width: w, height: h }, styles.sprite, sway]}>
        <Image source={FLUX} contentFit="contain" style={{ width: w, height: h }} />
        {!reduced && EYES.map((e) => <Lid key={e.cx} eye={e} w={w} h={h} lid={lid} />)}
      </Animated.View>
    </View>
  );
}
