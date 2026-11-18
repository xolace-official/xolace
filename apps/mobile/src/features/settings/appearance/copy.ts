import type { IconName } from "@/components/shared/icon";
import type { MotionPreference } from "@/lib/motion/use-effective-reduced-motion";
import type { ProfileCardId } from "@/store/store";

/**
 * Settings › Appearance (P/design/handoff/settings.md §1 "Appearance"), word for word, except
 * the Profile cards: production's names, the titles You draws them under.
 */
export const APPEARANCE_COPY = {
	card: {
		chip: "heavy",
		kicker: "What’s here right now...",
		title: "What’s here\nright now?",
	},
	cards: [
		{ id: "calendar", label: "Your days" },
		{ id: "rank", label: "Among the fires" },
		{ id: "week", label: "This week" },
	] as const satisfies readonly { id: ProfileCardId; label: string }[],
	general: "General",
	mode: "Mode",
	modeNote: {
		dark: "Always dark, whatever your phone is set to.",
		light: "Always light, whatever your phone is set to.",
		system: (dark: boolean) =>
			`Follows your phone. It’s ${dark ? "dark" : "light"} right now.`,
	},
	modes: [
		{ id: "system", label: "System" },
		{ id: "light", label: "Light" },
		{ id: "dark", label: "Dark" },
	] as const,
	motion: "Motion",
	motionCalm:
		"Fluid motion is calmed. The breathing exercise won’t expand and contract; it guides you with words and a steady haptic instead.",
	motionFull:
		"Everything stays gently in motion, including the breathing exercise.",
	motionLead: (osOn: boolean) =>
		`Follows your phone’s Reduce Motion, which is ${osOn ? "on" : "off"}. `,
	motionOverride:
		"Your phone asks apps to reduce motion, but Xolace will stay fully animated.",
	motions: [
		{ id: "system", label: "Match my phone" },
		{ id: "reduced", label: "Reduced motion" },
		{ id: "full", label: "Full motion" },
	] as const satisfies readonly { id: MotionPreference; label: string }[],
	night: "Night",
	nightA11y: "Night mode",
	nightNote:
		"Shifts the theme and words to match the rawer emotional register of late-night sessions.",
	nightRow: "Night mode (10pm–4am)",
	profile: "Profile",
	profileNote:
		"Hiding a card only takes it off your profile. Nothing else changes.",
	replay: "Replay intro",
	replayAlert: {
		body: "You’ll be taken back to the opening screens.",
		ok: "Replay",
		title: "Replay intro?",
	},
	saveFailed: "Couldn't save that",
	saveFailedBody: "Check your connection and try again.",
	theme: "Theme",
	themeA11y: (name: string, plus: boolean, locked: boolean) =>
		`${name} theme${plus ? ", Xolace+" : ""}${locked ? ", locked" : ""}`,
	themeNote: (name: string, plusTheme: boolean) =>
		`${name}${plusTheme ? ", from Xolace+." : "."} Four themes are free; Xolace+ adds six.`,
	themeNoteFree:
		"Four themes are free. The six after the line come with Xolace+.",
} as const;

/** The page's glyphs, with their Android twins. */
export const APPEARANCE_ICONS = {
	check: { android: "check", ios: "checkmark" },
	chevron: { android: "chevron_right", ios: "chevron.right" },
	lock: { android: "lock", ios: "lock" },
	plus: { android: "auto_awesome", ios: "sparkles" },
} as const satisfies Record<string, IconName>;
