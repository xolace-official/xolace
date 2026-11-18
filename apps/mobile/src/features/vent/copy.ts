/**
 * Vent's words (handoff `vent.md` §15): production's lines unless the board marks them v2.
 * Curly apostrophes, as the board. The reply itself comes from the server.
 */
export const VENT_COPY = {
	capAfter: "You’ve used today’s voice replies. They return tomorrow.",
	/** v2: today's voice replies are used, said before the vent starts. */
	capBefore: "Today’s voice replies are used. It still burns.",
	close: "Close",
	closeLabel: "Close and return",
	gone: "Gone.",
	hint: "Tap the mic and speak your weight",
	intro: [
		"This is a space to say the unsaid.",
		"Your voice is never stored.",
		"It goes when you close.",
	],
	micIdle: "Speak your weight",
	micOff: {
		action: "Open Settings",
		body: "Turn on the microphone in Settings to vent.",
		title: "Xolace can’t hear you.",
	},
	micRecording: "Let it go",
	/** VoiceOver announcements (§16). */
	said: { letting: "Letting go", listening: "Listening" },
	support: "Support is here if you want it",
	supportLabel: "Open crisis resources",
	/** v2: the line under the button while it listens. */
	underRecording: "Tap to let it go",
	/** v2: the same line in the last 10 s before the ceiling. */
	underSoon: "It lets go on its own in a moment",
	understand: "I understand",
} as const;
