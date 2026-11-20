/**
 * The age gate (C2). Production's copy (`age-gate-steps.tsx`), apostrophes curled and each way
 * on split into a title and a line. The copy says why, never where the lines are, so the sheet
 * doesn't teach which year to pick.
 */
import type { Href } from "expo-router";
import type { IconName } from "@/components/shared/icon";

type Outcome = { title: string; body: string };
type Way = {
	id: "kindling" | "library" | "crisis";
	icon: IconName;
	title: string;
	sub: string;
	href: Href;
};

export const AGE = {
	ask: {
		cont: "Continue",
		decline: "Prefer not to say",
		lead: "It decides who you can be matched with.",
		picker: "Date of birth",
		/** Who never sees the answer, by what it was asked for. */
		private: {
			letters: "Kept private. No one you write to or hear from sees it.",
			xolacer_chat: "Kept private. Xolacers never see it.",
		},
		saving: "Saving…",
		title: "When were you born?",
	},
	failed: "Couldn’t save that date. Try again.",
	ok: "OK",
	outcomes: {
		letters: {
			declined: {
				body: "Without a date of birth, letters stay closed. You can add it next time you write or say yes to receiving them.",
				title: "No problem",
			},
			not_available: {
				body: "Letters are for people 18 and over. There’s still plenty here for you.",
				title: "Letters aren’t open to you yet",
			},
			under_13: {
				body: "So we can’t open letters for you. If things feel heavy right now, someone at a crisis line can help.",
				title: "Xolace is for people 13 and over",
			},
		},
		xolacer_chat: {
			declined: {
				body: "Without a date of birth we can’t match you with a Xolacer. You can add it next time you ask to talk.",
				title: "No problem",
			},
			not_available: {
				body: "Talking with a Xolacer is for people 18 and over. There’s still plenty here for you.",
				title: "Xolacer chats aren’t open to you yet",
			},
			under_13: {
				body: "So we can’t open Xolacer chats for you. If things feel heavy right now, someone at a crisis line can help.",
				title: "Xolace is for people 13 and over",
			},
		},
	} satisfies Record<string, Record<string, Outcome>>,
	ways: [
		{
			href: "/kindling",
			icon: { android: "local_fire_department", ios: "leaf" },
			id: "kindling",
			sub: "A few small things to try, picked for you",
			title: "Kindling",
		},
		{
			href: "/explore/library",
			icon: { android: "menu_book", ios: "books.vertical" },
			id: "library",
			sub: "Stories and guides from people who’ve been there",
			title: "The Library",
		},
		{
			href: "/crisis-resources?from=xolacer_age_gate",
			icon: { android: "call", ios: "phone" },
			id: "crisis",
			sub: "Crisis lines, any time",
			title: "Need someone now?",
		},
	] as const satisfies readonly Way[],
} as const;
