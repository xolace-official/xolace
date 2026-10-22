/**
 * Figure sizing shared by the Mirror and Vent beats.
 *
 * The two slides are a matched pair (see the note in `story-beats.ts`), and the
 * character has to read as the SAME character at the SAME size when you swipe
 * between them. That only holds if one formula drives both — duplicating a
 * tuned expression across two files is how a pair silently drifts apart.
 *
 * The MIRROR sets the size, because it has the tighter budget: it must fit a
 * figure AND its reflection above the pagination. Vent, with only a figure,
 * follows it.
 */

/**
 * Slide area as a fraction of screen height, once the safe areas, the sign-in
 * block and the pagination row are taken out. Measured on device.
 */
const SLIDE_FRACTION = 0.764;


const TEXT_BLOCK = 270;

/** Held back so the figure never crowds the aside above it. */
const BREATHING_ROOM = 30;

/** How much of the flipped figure stays visible before the mask takes it. */
export const REFLECT_RATIO = 0.42;

/**
 * The pair's figure height. Figure + reflection together cost
 * (1 + REFLECT_RATIO) x this, so the figure takes whatever the text block
 * leaves. The floor matters more than the ceiling: below ~118 the reflection
 * stops reading as a reflection.
 */
export const deckFigureHeight = (screenHeight: number) =>
  Math.max(
    118,
    Math.min(
      290,
      (screenHeight * SLIDE_FRACTION - TEXT_BLOCK - BREATHING_ROOM) / (1 + REFLECT_RATIO),
    ),
  );

/**
 * The Xolacers beat's figure, as a multiple of the pair's.
 *
 * The 0.95 inside it is the same framing correction VENT_SCALE_MATCH applies —
 * `flux-sad.png` is drawn 0.602 wide-for-tall against the mirror's
 * 0.535, so at equal heights it would look wider than the same character on the
 * two beats either side of it.
 */
export const XOLACERS_SCALE = 1.28 * 0.95;

/**
 * `vent-bg.png` was generated in a later pass than `mirror-v2-bg.png` and is
 * framed slightly chunkier — its drawn content is 0.616 wide-for-tall against
 * the mirror's 0.535. Rendered at equal heights the Vent character looks ~15%
 * wider; at equal widths it looks ~13% shorter. This splits the difference, so
 * each dimension is off by ~7% instead of one being off by 15% — below the
 * threshold where the swipe reads as the character changing size.
 *
 * Delete this the day both poses are re-rendered from one framing.
 */
export const VENT_SCALE_MATCH = 0.945;
