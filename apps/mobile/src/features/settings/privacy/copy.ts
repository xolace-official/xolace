import type { IconName } from "@/components/shared/icon";

export const PRIVACY_COPY = {
	a11y: (line: string, memory: boolean, share: boolean) =>
		[
			`What Xolace keeps. ${line}.`,
			memory
				? "Remembers what you write."
				: "New sessions kept without their words.",
			share
				? "Sharing is picked for you after a session."
				: "Nothing is shared unless you say yes.",
			"Your voice, and who you write to, are never kept.",
		].join(" "),
	alert: {
		body: (count: string) =>
			`${count} of your sessions are older than that. They’ll be deleted within a day and can’t be brought back.`,
		capped: (count: number) => `More than ${count}`,
		ok: "Delete them",
		title: (ago: string) => `Delete sessions older than ${ago}?`,
	},
	copy: "Get a copy of my data",
	copyUrl: "mailto:privacy@xolaceinc.com?subject=A%20copy%20of%20my%20data",
	copyValue: "Email",
	delete: "Delete",
	deleteAccount: "Delete account",
	deleteData: "Delete all my data",
	deleteNote: "Both ask first, and say what goes and what stays.",
	footer: "Encrypted · never sold · never used to train AI",
	keep: "Keep my sessions",
	keepNote:
		"Older sessions are deleted by themselves within a day. Keeping longer starts from now; what’s gone doesn’t come back.",
	kicker: "What Xolace keeps",
	letters: "Letters",
	lettersNote:
		"Strangers write short, unsigned letters of encouragement. On: Xolace can place one with you, picked by how your recent sessions felt. The sender never learns who you are.",
	lettersRow: "Receive letters",
	memory: "Memory",
	memoryNote:
		"Xolace remembers what you’ve shared with it; that’s how it comes to know you. Turn this off and new sessions are kept without their words.",
	memoryOff: "From now on, sessions without their words",
	memoryOn: "What you write, so Xolace knows you",
	memoryRow: "Personal memory",
	never: "Never kept: your voice, or who you write to with Trusted Bridge",
	outside: (label: string) => `${label}, opens outside Xolace`,
	policy: "Privacy policy",
	shareNote:
		"After some sessions, Xolace offers to leave one short line for others who feel the same, with names and details taken out. On: “Yes” is picked for you, and you can still say not this time. A session in crisis is never shared.",
	shareOff: "Shared with no one unless you say yes",
	shareOn: "After a session, “Yes” to sharing is picked for you",
	shareRow: "Share by default",
	sharing: "Sharing",
	title: "Privacy & Data",
	yourData: "Your data",
} as const;

export type Retention = "indefinite" | "1_year" | "6_months";

export const RETENTION: readonly {
	id: Retention;
	label: string;
	sub: string;
	line: string;
	ago: string;
}[] = [
	{
		ago: "",
		id: "indefinite",
		label: "Until I delete them",
		line: "Your sessions, until you delete them",
		sub: "Nothing goes by itself",
	},
	{
		ago: "a year",
		id: "1_year",
		label: "1 year",
		line: "Your sessions, for a year",
		sub: "Sessions older than a year go",
	},
	{
		ago: "6 months",
		id: "6_months",
		label: "6 months",
		line: "Your sessions, for 6 months",
		sub: "Sessions older than 6 months go",
	},
];

export type SheetKind = "data" | "account";

export type DeleteSheetCopy = {
	title: string;
	lead: string;
	goes: readonly string[];
	stays: readonly string[];
	confirm: string;
	keep: string;
	done: string;
};

export const DELETE_COPY = {
	confirmHint: "Can't be undone.",
	failed: { description: "Please try again.", title: "Something went wrong" },
	goes: "Goes",
	plusBilling: {
		android:
			"Xolace+ billing, which is Google Play’s: cancel it in Google Play",
		ios: "Xolace+ billing, which is Apple’s: cancel it in your Apple ID",
	},
	sheets: {
		account: {
			confirm: "Delete account",
			done: "Signed out. Your account goes within a few hours.",
			goes: [
				"Your account and sign-in",
				"Everything you’ve written",
				"Badges, sparks and streak",
				"Your settings",
			],
			keep: "Keep my account",
			lead: "You’re signed out now, and everything goes within a few hours. Sign back in before then and nothing is deleted.",
			stays: [
				"If a session ever raised a safety concern, an anonymous record of it: none of your words, no name",
				"If you linked Telegram, Xolace deletes the messages it still can, but Telegram keeps the rest of that chat’s history.",
			],
			title: "Delete your account?",
		},
		data: {
			confirm: "Delete everything",
			done: "Deleting your data. It takes a minute.",
			goes: [
				"Sessions, reflections and Talk",
				"What Xolace remembers about you",
				"Your answers from the start",
				"The name Ember calls you",
			],
			keep: "Keep my data",
			lead: "Everything you’ve written goes, now and for good. Your account stays, so you can start again.",
			stays: [
				"Your account and Xolace+",
				"Your settings",
				"Badges, sparks and days showed up",
			],
			title: "Delete all my data?",
		},
	} satisfies Record<SheetKind, DeleteSheetCopy>,
	signOutLeft: {
		confirm: "Sign out",
		lead: "Your account is being deleted. Sign out to finish.",
	},
	stays: "Stays",
	working: "Deleting…",
} as const;

export const PRIVACY_ICONS = {
	check: { android: "check", ios: "checkmark" },
	copy: { android: "mail", ios: "envelope" },
	deleteAccount: {
		android: "person_remove",
		ios: "person.crop.circle.badge.xmark",
	},
	deleteData: { android: "delete", ios: "trash" },
	memory: { android: "lightbulb", ios: "lightbulb" },
	never: { android: "lock", ios: "lock" },
	policy: { android: "description", ios: "doc.text" },
	sessions: { android: "layers", ios: "square.stack.3d.up" },
	share: { android: "share", ios: "point.3.connected.trianglepath.dotted" },
} as const satisfies Record<string, IconName>;
