import type { IconName } from "@/components/shared/icon";
import type { MirrorTone } from "@/features/settings/mirror/mirror-model";

/** Settings › Mirror (P/design/handoff/settings.md §1 "Mirror"), word for word. */
export const MIRROR_COPY = {
	autoLine: (tone: string) => `Speaks in the voice made for ${tone}.`,
	directness: "Directness",
	entry: "“I keep telling everyone I’m fine. I’m tired of saying it.”",
	hear: (name: string) => `Hear ${name}`,
	kicker: "A SAMPLE · NOT YOUR WORDS",
	locked: " Comes with Xolace+.",
	pace: "Pace",
	plusName: (label: string) => `${label} · Xolace+`,
	plusSpoken: "Xolace+",
	saveFailed: "Couldn't save that",
	saveFailedHint: "Check your connection and try again.",
	seePlus: "See Xolace+",
	stop: "Stop",
	stopA11y: "Stop the preview",
	sub: "How the mirror answers what you write, and how it sounds.",
	talk: (name: string) => `Talk with ${name}`,
	talkNote: (name: string) =>
		`Changes apply from your next talk. You can also ask ${name} to slow down mid-talk.`,
	talkVoice: "Voice",
	toneGate: "Witnessed comes with Xolace+.",
	voice: "Voice",
	voiceAside: "Reads your mirror and vents aloud",
} as const;

/** Each tone on the sample card: production's name and description, the handoff's line. */
export const TONES: readonly {
	id: MirrorTone;
	label: string;
	desc: string;
	line: string;
	lead?: string;
	plus?: boolean;
}[] = [
	{
		desc: "Reads your writing style and mirrors it back",
		id: "adaptive",
		label: "Adaptive",
		line: "You keep saying fine. You’re tired of saying it. Maybe tired of carrying it, too.",
	},
	{
		desc: "Evocative, metaphor-rich language",
		id: "poetic",
		label: "Poetic",
		line: "“Fine” has become a coat you wear for everyone else, and by evening it weighs more than you do.",
	},
	{
		desc: "Warm, simple language",
		id: "gentle",
		label: "Gentle",
		line: "It sounds like you’ve been holding a lot behind that one small word. It’s okay to be tired of it.",
	},
	{
		desc: "Clear and minimal, no metaphors",
		id: "direct",
		label: "Direct",
		line: "You’re telling people you’re fine when you’re not, and keeping that up is wearing you out.",
	},
	{
		desc: "Begins with a moment of recognition, then mirrors",
		id: "witnessed",
		label: "Witnessed",
		lead: "“That’s a lot to keep to yourself.”",
		line: "You’ve been saying “fine” for other people, and it’s been costing you.",
		plus: true,
	},
];

export const MIRROR_ICONS = {
	lock: { android: "lock", ios: "lock.fill" },
	play: { android: "play_arrow", ios: "play.fill" },
	stop: { android: "stop", ios: "stop.fill" },
} as const satisfies Record<string, IconName>;
