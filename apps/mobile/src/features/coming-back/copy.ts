import type { Href } from "expo-router";
import type { IconName } from "@/components/shared/icon";

export type Away =
	| "recent"
	| "away-14-30"
	| "away-30-90"
	| "away-90-plus"
	| "anniversary"
	| "next";

export type Answer =
	| "lighter"
	| "still_here"
	| "heavier"
	| "processed"
	| "vent";
export type CheckInPick = Exclude<Answer, "vent">;
export type CheckInTier = "acute" | "elevated" | "standard";

export const ANSWER_LABEL: Record<Answer, string> = {
	heavier: "Got heavier",
	lighter: "Feeling lighter",
	processed: "I worked through it",
	still_here: "Still sitting with it",
	vent: "Let it out",
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const AWAY: Record<
	Exclude<Away, "next">,
	{ title: string; body: string; cta: string }
> = {
	anniversary: {
		body: "A year ago you showed up here for the first time. Glad you keep finding your way back.",
		cta: "Continue",
		title: "One year on.",
	},
	"away-14-30": {
		body: "A couple of weeks away. What counts is you found your way back.",
		cta: "Let’s begin",
		title: "Welcome back.",
	},
	"away-30-90": {
		body: "It’s been a while, and that’s alright. You’re here now.",
		cta: "I’m here",
		title: "Good to see you again.",
	},
	"away-90-plus": {
		body: "Months have passed, and still, here you are. That takes something real.",
		cta: "Sit with me",
		title: "You came back.",
	},
	recent: {
		body: "A few days away, a few feelings to set down. That’s just being human.",
		cta: "I’m ready",
		title: "There you are.",
	},
};

export const WELCOME_BACK = {
	a11y: "Welcome back",
	checkIn: {
		done: (a: Answer) => `Answered · ${ANSWER_LABEL[a]}`,
		doneA11y: (day: string, a: Answer) =>
			`A check-in from ${day}. Answered, ${ANSWER_LABEL[a].toLowerCase()}.`,
		sub: "About a minute",
		title: (day: string) => `A check-in from ${day}`,
	},
	freeze: {
		sub: (streak: number) =>
			streak > 0
				? `Your ${streak}-day streak is still going`
				: "Your streak is still going",
		title: "A freeze kept your fire lit",
	},
	next: {
		cta: "Later",
		one: (day: string | null) =>
			day
				? `One thing from ${day}, if you want it.`
				: "One thing for this month, if you want it.",
		title: (name: string | null) => (name ? `Hi again, ${name}.` : "Hi again."),
		two: "Two things, if you want them.",
	},
	page: {
		article: "Read the full article",
		back: "Back",
		bar: "This month",
		label: "A prompt for this week",
		pass: "Let it pass",
		write: "Write about it",
	},
	pill: {
		both: "2 things from while you were away",
		checkIn: (day: string) => `${cap(day)}’s check-in is still here`,
		prompt: "This month’s prompt is still here",
	},
	prompt: {
		doneTitle: "This month’s prompt",
		passed: "Let it pass · It won’t come back",
		passedA11y: "This month’s prompt. Let it pass, it won’t come back.",
		read: "Read · On your reflect card this week",
		readA11y: "This month’s prompt. Read, on your reflect card this week.",
		sub: "Tap to read, or let it pass",
		title: "This month’s prompt is here",
	},
	stillHere: {
		body: "Whenever you’re ready.",
		done: "Done",
		title: "Still here.",
		waiting: "Not now",
	},
	today: "today",
	yesterday: "yesterday",
} as const;

export const CHECK_IN = {
	close: "Close check-in",
	eyebrow: "Checking back in",
	fallbackQuestion: "How is it sitting with you now?",
	heavierMessage:
		"If something would help right now, pick one. Or just close this.",
	mascot: "Flux, the Xolace companion, checking back in with you",
	notNow: "Not now",
	reflective: {
		done: "Done",
		lighter: {
			a11y: "What helped? Optional",
			placeholder: "A walk, a person, a song… or nothing you can name",
		},
		milestone: "You set this one down. That’s yours to keep.",
		processed: {
			a11y: "What got you there? Optional",
			placeholder:
				"A realization, a conversation, time… or nothing you can name",
		},
		saved: "Saved.",
		savedShared: "Saved. It will be shared anonymously.",
		saveFailed: "Couldn’t save that. Try again?",
		saving: "Saving…",
		share: "Share anonymously with others who feel this",
		skip: "Skip for now",
	},
	resources: "Resources are still here",
	step: {
		heavier: "Thank you for telling me. You don’t have to carry it alone.",
		lighter: "Good to hear. What helped?",
		processed: "You worked through it. What got you there?",
		still_here: "That’s okay. Some things take longer to set down.",
	} satisfies Record<CheckInPick, string>,
	stillMessage:
		"Nothing to do here. If you want something beside you while it sits, these are close.",
	vent: {
		a11y: "Let it out. Open voice vent, your voice is never stored",
		label: "Let it out",
		sub: "Say it out loud. Nothing is kept.",
	},
} as const;

export type Place = "crisis_resources" | "music" | "support_audio" | "library";

export const PLACES: Record<
	Place,
	{ title: string; sub: string; icon: IconName; href: Href }
> = {
	crisis_resources: {
		href: "/crisis-resources",
		icon: { android: "call", ios: "phone" },
		sub: "People you can reach right now",
		title: "Talk to someone",
	},
	library: {
		href: "/explore/library",
		icon: { android: "menu_book", ios: "book.closed" },
		sub: "Stories from people who’ve been here",
		title: "Lantern",
	},
	music: {
		href: "/explore/list?family=music",
		icon: { android: "music_note", ios: "music.note" },
		sub: "Something to listen to",
		title: "Music",
	},
	support_audio: {
		href: "/explore/list?family=support",
		icon: { android: "headphones", ios: "headphones" },
		sub: "A voice to sit with",
		title: "Support audio",
	},
};

export const STILL_PLACES = [
	"music",
	"support_audio",
	"library",
] as const satisfies readonly Place[];
export const HEAVIER_PLACES = [
	"crisis_resources",
	"music",
	"support_audio",
	"library",
] as const satisfies readonly Place[];

export const BANNER = {
	dismiss: "tap to dismiss",
	eyebrow: "You were reached",
} as const;
