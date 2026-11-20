import type { IconName } from "@/components/shared/icon";

export const NOTIFY_COPY = {
	alert: {
		body: "Your device is blocking notifications, so this can’t be turned on from here. You can allow them in device settings.",
		ok: "Open Settings",
		title: "Notifications are off for Xolace",
	},
	banner: {
		body: "Your phone is blocking them, so nothing on this screen can reach you yet.",
		cta: "Open Settings",
		title: "Notifications are off for Xolace",
	},
	chatNote:
		"When someone asks to talk, answers your request, or writes while you’re away. Never what was written.",
	chatRow: "Chat notifications",
	checkIns: "Check-ins",
	conversations: "Conversations",
	dailyQuote: "Daily quote",
	dailyQuoteNote:
		"Today’s quote, once a day at the time you choose. If it was made from your reflections, the notification says only that it’s here.",
	dailyQuotePaused:
		"Paused after a few went unopened. Turn it back on whenever you like.",
	dailyQuoteRow: "Daily quote",
	dailyQuoteSlots: {
		afternoon: "Afternoon",
		evening: "Evening",
		morning: "Morning",
	},
	dayLabels: ["noon", "6 pm", "midnight", "6 am", "noon"],
	letters: "Letters",
	lettersNote:
		"One line when a letter is placed with you: “Someone wrote you a letter.” Never what it says. During quiet hours it waits until they end.",
	lettersRow: "Letters",
	notAfter: "Not after",
	notBefore: "Not before",
	quiet: "Quiet hours",
	quietNote: (after: string, before: string) =>
		`No reminders between ${after} and ${before}. One that’s due waits until morning.`,
	quietOffNote: "Reminders can arrive at any hour.",
	reach: "How I reach out",
	reachRow: "Reach me on…",
	reminders: "Reminders",
	remindersNote:
		"Now and then, one short line from Xolace: when you haven’t been by in a while, around the time you usually come, or just something a friend might text.",
	remindersRow: "Gentle reminders",
	sample: {
		a11y: (line: string, held: boolean) =>
			`A sample reminder: ${line}${held ? " Held until morning by quiet hours." : ""}`,
		a11yOff: "No reminders",
		app: "Xolace",
		date: "Sunday 9 November",
		held: (before: string) => `Held until ${before} · quiet hours`,
		kicker: "A SAMPLE",
		nothing: "Nothing can reach you right now",
		now: "now",
		remindersOff: "Gentle reminders are off",
		time: "9:30",
	},
} as const;

export type Reach = "warm" | "direct" | "quiet";

export const REACH: readonly {
	id: Reach;
	label: string;
	desc: string;
	line: string;
}[] = [
	{
		desc: "Gentle recognition, like a friend who notices without demanding.",
		id: "warm",
		label: "Warm",
		line: "Sunday evenings have asked a lot of you lately. There’s room tonight if you want it.",
	},
	{
		desc: "Honest and pattern-aware, gets to the point.",
		id: "direct",
		label: "Direct",
		line: "Sunday nights are usually when it piles up for you. Tonight might be one of them.",
	},
	{
		desc: "Minimal presence, often just a word or two.",
		id: "quiet",
		label: "Quiet",
		line: "Still here, if tonight’s heavy.",
	},
];

export const NOTIFY_ICONS = {
	blocked: { android: "notifications_off", ios: "bell.slash" },
	moon: { android: "bedtime", ios: "moon.fill" },
	pick: { android: "unfold_more", ios: "chevron.up.chevron.down" },
	reachMeOn: { android: "send", ios: "paperplane" },
	sun: { android: "light_mode", ios: "sun.max" },
	xmark: { android: "close", ios: "xmark" },
} as const satisfies Record<string, IconName>;
