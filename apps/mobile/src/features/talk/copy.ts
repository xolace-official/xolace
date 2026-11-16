/**
 * Everything Talk says (handoff `talk.md` §2–§4, §9): the start screen, its two sheets,
 * and the talk. The companion goes by the space name, so lines that name it take it.
 * What's kept is production's consent card, word for word (`PRIVACY_LINE` is rule 12:
 * literally true when it ships).
 */
import { TALK_TIME_RESETS } from "@/lib/talk/talk-time";

export const TALK_COPY = {
	kept: {
		ai: (name: string) =>
			`${name} is an AI, part of Xolace. This talk is remembered with your reflections.`,
		end: (name: string) =>
			`You can end whenever you like, from the menu up top or just tell ${name} you want to end here. Stop wherever feels right; you don't have to go deeper than you want.`,
		full: "A talk lasts up to 15 minutes.",
		gotIt: "Got it",
		mirror:
			"When you finish, the whole talk becomes your mirror, like any reflection.",
		privacy:
			"Your talk is saved as text in Xolace, like a reflection, and goes when you delete your data. We don't keep a recording. Our voice provider is set to keep nothing and we ask it to delete its copy as soon as you finish.",
		speak: "Speak whenever you like, or type. Both land in the same talk.",
		sub: "What a talk is, and what’s kept",
		title: "Before you talk",
	},
	live: {
		cantOpen: (type: string) =>
			type === "phone"
				? "Unable to open dialer. Please dial manually."
				: "Unable to open that. Please try it yourself.",
		clock: (presence: string, clock: string) => `${presence} · ${clock} left`,
		ended: "Ended. Your mirror waits in your timeline",
		endMirror: "End and make my mirror",
		help: "Get help now",
		helpMore: "More help, in your country",
		helpPeople: "People who can help right now",
		justEnd: "Just end",
		leave: {
			body: "Your mirror can come now. Or just end: your mirror waits in your timeline.",
			keep: "Keep talking",
			mirror: "Make my mirror",
			title: "End this talk?",
		},
		listening: "Listening",
		menuHead: (minutes: number) => `${minutes} min left in this talk`,
		micOff: "Mic off",
		mirrorLater: "Your mirror waits in your timeline",
		mute: "Mute mic",
		placeholder: (name: string) => `Speak or message ${name}`,
		send: "Send",
		smiles: "Smiles back",
		spoken: "spoken",
		unmute: "Unmute mic",
		views: [
			{ id: "conversation", label: "Conversation" },
			{ id: "companion", label: "Companion" },
		],
		you: "You",
	},
	start: {
		back: "Back",
		button: "Start talking",
		directness: "Directness",
		facts: {
			ai: (name: string) => `${name} is an AI, part of Xolace.`,
			full: "Up to 15 minutes. End whenever you like.",
			kept: "Kept as text with your reflections. No recording.",
			none: "Not enough talk time left this week. More on Monday.",
			some: (minutes: number) =>
				`About ${minutes} minutes left this week. End whenever you like.`,
		},
		footnote: {
			kept: "What’s kept",
			low: "You can still write a reflection any time · ",
			mic: "We’ll ask for the microphone once · ",
		},
		look: "Look",
		lookValue: (label: string, n: number, of: number) =>
			`${label}, ${n} of ${of}`,
		micOff: "Microphone is off. Turn it on in Settings to talk.",
		options: "Talk options",
		pace: "Pace",
		paceLabel: (pace: string, directness: string) =>
			`Pace ${pace}, Directness ${directness}`,
		/** Under the weekly minimum, on the button. */
		resets: TALK_TIME_RESETS,
		sub: "Speak or type. When you finish, the talk becomes your mirror.",
		title: (name: string) => `Talk it through\nwith ${name}`,
		voice: (name: string) => `${name} voice`,
		voiceHint: (trait: string) => `${trait}. Plays a sample.`,
	},
	style: {
		close: "Close",
		directness: [
			{ id: "gentle", label: "Gentle" },
			{ id: "balanced", label: "In between" },
			{ id: "straight", label: "Straight" },
		],
		done: "Done",
		note: (name: string) => `You can also ask ${name} to slow down mid-talk.`,
		pace: [
			{ id: "slower", label: "Slower" },
			{ id: "normal", label: "Normal" },
		],
		sub: "Kept for every talk",
		title: (name: string) => `How ${name} talks`,
	},
} as const;
