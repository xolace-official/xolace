/**
 * The proof beat's visual: a dark field with one ember in it for every person
 * who sat with the same feeling this week.
 *
 *        ·     ·          ·        ·
 *     ·      ·       ·         ·        ·
 *        ·        ·       ·        ·
 *
 * THE COUNT IS THE PICTURE, NOT A CAPTION ON ONE. A card that says "22 campers"
 * asks you to believe a number. Twenty-two lights in the dark ARE twenty-two —
 * countable, and the same claim made in a form that cannot be inflated. This is
 * the one place in the deck where the artifact and the statistic are the same
 * object, so `count` drives the geometry directly and nothing else may.
 *
 * THEY ARRIVE IN DEPTH BANDS, NOT ALL AT ONCE. Three layers light ~200ms apart,
 * far and dim first, near and bright last. A single fade reads as a texture
 * switching on; staggered by depth it reads as a field that goes back further
 * than the screen — which is the actual feeling being sold, that there are more
 * of these than you can see.
 *
 * WHY A JITTERED GRID AND NOT RANDOM POINTS. True random clumps, and a clump
 * looks like a group — which on this beat would say something we do not mean
 * (nobody here is together). One ember per cell with a deterministic offset
 * keeps them evenly alone. Deterministic, so the constellation is the same on
 * every render and never flickers into a new arrangement mid-swipe.
 *
 * ONE OF THEM SPEAKS. `VOICED` is held out of the scatter and drawn larger with
 * a halo; the beat hangs a real review off it. It sits low and left so the
 * quote can drop straight down from it without crossing the field.
 */
import { View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { EmberGlow } from './ember-glow';

export const VOICED = { x: 0.08, y: 0.78 };
/** Points cleared around it, so the speaking ember never sits in a crowd. */
const CLEARANCE = 52;

/** Bands, far to near. Radius and alpha are the only depth cues there are on a
 *  flat field, so they carry it: a far ember is half the size and a third the
 *  brightness of a near one. Kept small on purpose — past ~3pt a dot stops
 *  reading as a distant light and starts reading as an object. */
const BANDS = [
  { r: 1.1, opacity: 0.22, delay: 0 },
  { r: 1.6, opacity: 0.4, delay: 200 },
  { r: 2.2, opacity: 0.72, delay: 400 },
];

/** After the beat's own text has landed — matches `PatternLine`'s FIND. */
const LIGHT = 700;

/** Deterministic 0..1 from an integer. The usual fract(sin) trick: no seeded
 *  PRNG to carry around, same answer on every render and both platforms. */
const noise = (n: number) => {
  const v = Math.sin(n * 12.9898) * 43758.5453;
  return v - Math.floor(v);
};

/**
 * One ember per grid cell, nudged off the cell centre so the grid never shows.
 * The cell is kept 78% wide for the jitter, which is the most it can take
 * before neighbours start touching at the corners.
 */
const scatter = (count: number, width: number, height: number) => {
  const cols = Math.max(1, Math.round(Math.sqrt((count * width) / height)));
  const rows = Math.max(1, Math.ceil(count / cols));
  const cw = 1 / cols;
  const ch = 1 / rows;

  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i += 1) {
    const x = (i % cols) * cw + cw * (0.11 + noise(i + 1) * 0.78);
    const y = Math.floor(i / cols) * ch + ch * (0.11 + noise(i + 91) * 0.78);
    // Measured in points, not in normalised units — the box is wider than it
    // is tall, so a normalised radius would clear an ellipse.
    const dx = (x - VOICED.x) * width;
    const dy = (y - VOICED.y) * height;
    const dist = Math.hypot(dx, dy);

    // PUSHED OUT, NEVER DROPPED. Skipping a point inside the clearance would
    // silently render fewer embers than `count`, and on this beat the drawn
    // count IS the claim — a field that quietly loses three people is a false
    // one. Projecting them onto the clearance edge keeps the arithmetic exact
    // and reads as light holding a little space around itself.
    const scale = dist < CLEARANCE ? CLEARANCE / Math.max(dist, 0.001) : 1;
    points.push({ x: x * width + dx * (scale - 1), y: y * height + dy * (scale - 1) });
  }
  return points;
};

export const EmberField = ({
  count,
  color,
  width,
  height,
}: {
  /** How many people. Drawn literally — see the note above. */
  count: number;
  color: string;
  width: number;
  height: number;
}) => {
  const reduced = useReducedMotion();
  const points = scatter(Math.max(0, count - 1), width, height);

  // The halo is drawn in points, not viewbox units, so it stays a light source
  // rather than stretching with the box.
  const halo = Math.min(width, height) * 0.42;

  return (
    <View style={{ width, height }} pointerEvents="none">
      {BANDS.map((band, index) => (
        <Animated.View
          key={band.delay}
          entering={reduced ? undefined : FadeIn.delay(LIGHT + band.delay).duration(900)}
          className="absolute inset-0"
        >
          <Svg width={width} height={height}>
            {points
              // Dealt round-robin rather than sliced into thirds: contiguous
              // slices follow the grid order, which would land each depth in
              // its own horizontal stripe and turn the field into a gradient.
              .filter((_, i) => i % BANDS.length === index)
              .map((p) => (
                <Circle
                  key={`${p.x}-${p.y}`}
                  cx={p.x}
                  cy={p.y}
                  r={band.r}
                  fill={color}
                  opacity={band.opacity}
                />
              ))}
          </Svg>
        </Animated.View>
      ))}

      {/* The one with a voice. Last to arrive, and the only ember on the field
          with a halo — that is what marks the quote below as coming from
          inside the picture instead of sitting under it. */}
      <Animated.View
        entering={reduced ? undefined : FadeIn.delay(LIGHT + 700).duration(1000)}
        className="absolute items-center justify-center"
        style={{
          left: VOICED.x * width - halo / 2,
          top: VOICED.y * height - halo / 2,
          width: halo,
          height: halo,
        }}
      >
        <View className="absolute inset-0">
          <EmberGlow id="proof-voiced" size={halo} color={color} opacity={0.4} />
        </View>
        <View className="rounded-full w-1.5 h-1.5" style={{ backgroundColor: color }} />
      </Animated.View>
    </View>
  );
};
