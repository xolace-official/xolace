/**
 * The one value the `--color-cover-*` tokens can't express: the scrim that
 * darkens the bottom of the cover photo so the title reads on any image.
 * See the fixed-palette note beside the tokens in global.css.
 */
export const COVER_SCRIM = {
  colors: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.65)'] as const,
  locations: [0.35, 1] as const,
};
