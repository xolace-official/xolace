/**
 * The parts of Today's light a theme token can't give: values SVG, Skia and text
 * shadows take as strings, fixed on purpose because they are fire and daylight,
 * the same in every theme (as Vent's `vent-palette.ts`). The sky's own palette is
 * in `sky/sky-model.ts`. Everything else on Today reads the theme.
 */

/** The streak flame's white-hot core (the outer flame is the theme's `ember`). */
export const FLAME_CORE = "#FFE2AE";
/** The chip's glow as the flame ignites: ember at .6, 24 pt. */
export const IGNITE_GLOW = "0 0 24px 6px rgba(242,163,58,0.6)";
/** The warm gleam that passes over each greeting word on the first open. */
export const GLEAM_GLOW = "rgba(255,214,170,0.95)";
