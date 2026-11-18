import type { TodayPhase } from "./today-model";

/**
 * Every string Today shows (design/handoff/today.md §3, the TodayAlive board). The
 * board's "Thursday" and "Ama" are the device's weekday and the user's display name.
 */
export const COPY = {
	/** The greeting, with the display name when there is one. */
	greeting: {
		dawn: (name: string | null) =>
			name ? `Good morning, ${name}` : "Good morning",
		day: (name: string | null) =>
			name ? `Good afternoon, ${name}` : "Good afternoon",
		evening: (name: string | null) =>
			name ? `Good evening, ${name}` : "Good evening",
		late: (name: string | null) => (name ? `Still up, ${name}?` : "Still up?"),
	} satisfies Record<TodayPhase, (name: string | null) => string>,
	help: "Get help now",
	lateCare: {
		sub: "People you can reach, any time",
		title: "If tonight is heavy",
	},
	/** VoiceOver only: the toolbar's Reflect pill. */
	opensReflect: "Opens Reflect",
	/** The eyebrow's second half, after the weekday ("Thursday · evening"). */
	partOfDay: {
		dawn: "early",
		day: "afternoon",
		evening: "evening",
		late: "late",
	} satisfies Record<TodayPhase, string>,
	reflect: "Reflect",
	streakHint: "Opens You",
	streakLabel: (n: number) => (n === 1 ? "1 day streak" : `${n} day streak`),
	title: "Today",
} as const;
