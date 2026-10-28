// Figure sizing shared by the Mirror and Vent beats, so the pair's character stays
// one size across the swipe. The Mirror sets it (figure plus reflection must fit).

/** Slide area as a fraction of screen height after safe areas, sign-in and pagination. */
const SLIDE_FRACTION = 0.764;

const TEXT_BLOCK = 270;

/** Held back so the figure never crowds the aside above it. */
const BREATHING_ROOM = 30;

/** How much of the flipped figure stays visible before the mask takes it. */
export const REFLECT_RATIO = 0.42;

/** The pair's figure height: what the text block leaves, split with the reflection. Below ~118
 * the reflection stops reading. */
export const deckFigureHeight = (screenHeight: number) =>
	Math.max(
		118,
		Math.min(
			290,
			(screenHeight * SLIDE_FRACTION - TEXT_BLOCK - BREATHING_ROOM) /
				(1 + REFLECT_RATIO)
		)
	);

/** The Xolacers figure as a multiple of the pair's; 0.95 corrects framing like VENT_SCALE_MATCH
 * (0.602 vs 0.535 wide-for-tall). */
export const XOLACERS_SCALE = 1.28 * 0.95;

/** `vent-bg.png` is framed chunkier (0.616 vs 0.535 wide-for-tall); this splits the ~15%
 * difference. Delete once both poses share one framing. */
export const VENT_SCALE_MATCH = 0.945;
