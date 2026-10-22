type WashTokens = {
  accent: string;
  surface: string;
  surfaceTertiary: string;
  background: string;
};

/**
 * Nine stops, 45° apart, starting at 3 o'clock and running clockwise. Skia
 * spaces a `SweepGradient`'s colours evenly when no `positions` are given —
 * first at 0°, last at 360° — and even spacing is what this ramp wants: the
 * peak lands exactly straight down, and the quiet stops get the same width as
 * the loud ones instead of a dead wedge before the wrap.
 *
 * Three things make a sweep read as light on a surface rather than as paint:
 *
 * 1. The centre sits at the middle of the screen (`ReflectWash`'s `c`). A
 *    sweep assigns colour by ANGLE, so a centre pushed into a corner gives the
 *    wedge pointing at the bulk of the screen almost all the visible area —
 *    the other stops compress into a corner you can't see.
 * 2. Enough stops to fill the turn. Six leaves each stop a 60° wedge that a
 *    55px blur mostly averages away.
 * 3. Most of the turn is quiet: the bottom half carries the colour, the top
 *    falls through the surface ramp into `--background`.
 *
 * The bottom half rises to a peak straight down and falls off evenly — an
 * unordered ramp reads as two blobs with a dip between them, not as fill. The
 * top is quiet but not flat: one 8% accent stop on the up-right keeps it off
 * the floor.
 *
 * Colours come from tokens, never hex. `--accent` is the only one that
 * actually moves per palette (`--ember` is the same orange in all eleven —
 * #246 story 19), so accent at varying alpha carries the colour and the
 * surface ramp carries the falloff into the quiet side.
 */
export const buildSweepStops = ({
  accent,
  surface,
  surfaceTertiary,
  background,
}: WashTokens) => [
  accent + "33", //   0° right
  accent + "4D", //  45° down-right
  accent + "73", //  90° down — peak
  accent + "4D", // 135° down-left
  accent + "26", // 180° left
  surfaceTertiary, // 225° up-left
  surface, //        270° up
  accent + "14", // 315° up-right — the lift
  background, //     360° ≡ 0°, closing the turn
];
