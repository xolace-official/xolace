/** The scrim the `--color-player-*` tokens cannot express (fixed-palette note in global.css). */
export const PLAYER_SCRIM = {
	colors: ["rgba(0,0,0,0.15)", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.92)"] as const,
	locations: [0, 0.5, 1] as const,
};
