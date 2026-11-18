import type { TodayPhase } from "./today-model";

/**
 * Every string Today shows (design/handoff/today.md §3, the TodayAlive board). The
 * board's "Thursday" and "Ama" are the device's weekday and the user's display name.
 */
export const COPY = {
	/** The Reflect card (board `.hero`): its question by phase, the field's rotating lines and the hint. */
	card: {
		/** VoiceOver only; `doors` is the doors' list ("Talk and Vent"). */
		a11yHint: (doors: string, count: number) =>
			`Opens Reflect. ${doors} ${count === 1 ? "is" : "are"} in actions.`,
		and: "and",
		hint: (doors: string) => `Hold the card for ${doors}`,
		/** The month's prompt on the card while it's carried this week (board `.ph.wrote .tref`). */
		monthLabel: "THIS MONTH",
		or: "or",
		placeholders: {
			day: [
				"Write it out…",
				"Start with one word…",
				"Or hold the mic and say it",
			],
			late: [
				"Say it, then set it down…",
				"One line is enough…",
				"Or hold the mic and say it",
			],
		},
		prompt: {
			dawn: "What are you waking up with?",
			day: "What's sitting with you right now?",
			evening: "What's sitting with you right now?",
			late: "What's carrying over?",
		} satisfies Record<TodayPhase, string>,
		speak: "Speak instead",
	},
	/** Hold the card: the doors rise out of the hint line. */
	doors: {
		sit: { label: "Sit with this", sub: "Breathe first" },
		talk: { label: "Talk", sub: "Out loud" },
		title: "How do you want to let it out?",
		vent: { label: "Vent", sub: "Let it rip" },
		writeInstead: "Write instead",
	},
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
