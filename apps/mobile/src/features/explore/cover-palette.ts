/**
 * Ink on a topic's cover, which the `--color-cover-*` tokens can't express as stops or alpha
 * steps (the fixed-palette note in global.css): a 22% wash under the status bar, clear through the
 * middle, 42% under the name.
 */
export const TOPIC_SCRIM = {
	colors: [
		"rgba(0,0,0,0.22)",
		"rgba(0,0,0,0)",
		"rgba(0,0,0,0)",
		"rgba(0,0,0,0.42)",
	] as const,
	locations: [0, 0.32, 0.46, 1] as const,
};
