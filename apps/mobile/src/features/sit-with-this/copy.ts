/**
 * Every string Sit with this shows (design/handoff/sit.md, the board's `SIT`
 * and `LABEL`). The exercise's own lines come from the catalogue
 * (`exercises.getForSession`), through `sit-model.ts`.
 */
export const COPY = {
	/** The first screen's close, when Sit replays a kindling twig. */
	backToKindling: "Back to your kindling",
	/** The first screen's close, when a letter's care sheet opened it. */
	backToLetter: "Back to your letter",
	/** The first screen's close, when Today's Sit door opened it. */
	backToToday: "Back to Today",
	begin: "Begin",
	different: "Something different",
	empty: { back: "Go back", body: "No exercise available right now." },
	eyebrow: "Sit with this",
	fromMirror: "From your mirror",
	leave: "Leave Sit with this",
	/** The real length (board `lengthLabel`), never production's "about 90 seconds". */
	length: {
		minute: "About a minute.",
		minutes: (m: number) => `About ${m} minutes.`,
		seconds: (s: number) => `About ${s} seconds.`,
		stay: "Stay with it.",
	},
	loading: "Getting ready…",
	names: {
		find_your_edges: "Find your edges",
		let_it_land: "Let it land",
		make_room: "Make room",
		reset: "Three breaths",
		soften_toward_it: "Soften toward it",
		speak_to_it: "Speak to it",
	} as Readonly<Record<string, string>>,
	pause: "Pause",
	paused: "Paused",
	pausedChip: "Paused. Tap play when you’re ready.",
	/** The sigh's second phase is a second, short inhale, not "Hold" (handoff §0). */
	phases: ["Breathe in", "A little more", "Breathe out"],
	play: "Go on",
	sheet: {
		failed: "Couldn’t switch. Try again in a moment.",
		keepGoing: "Keep going",
		other: "Try something else",
		simpler: "Try something simpler",
		sub: (swaps: number) =>
			`It waits while you choose. ${swaps === 0 ? "You can switch twice." : "You can switch once more."}`,
		title: "Something else?",
	},
	stayed: {
		done: "Done",
		sub: "Take whatever you need from this.",
		title: "You stayed.",
	},
	/** A catalogue entry this build doesn't name yet. */
	unnamed: "Sit with this",
	write: {
		done: "Done",
		lock: "This isn’t saved or sent. It’s just for you.",
		placeholder: "Say it however it comes.",
	},
} as const;
