/**
 * The one value the `--color-player-*` tokens can't express: the scrim that
 * darkens the blurred artwork toward the bottom, where the controls sit.
 * See the fixed-palette note beside the tokens in global.css.
 */
export const PLAYER_SCRIM = {
  colors: ["rgba(0,0,0,0.15)", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.92)"] as const,
  locations: [0, 0.5, 1] as const,
};
