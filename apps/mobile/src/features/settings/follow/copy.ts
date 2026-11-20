import type { IconName } from "@/components/shared/icon";

/** Settings › Follow & Support (P/design/handoff/settings-sections.md §1), word for word. */
export const FOLLOW_COPY = {
	dialog: {
		cancel: "Cancel",
		count: (n: number) => `${n} / 1000`,
		desc: "What’s on your mind?",
		/** Production's hint on the field. */
		hint: "Up to 1000 characters",
		limited: "You’ve sent feedback today. Come back tomorrow.",
		placeholder: "Tell us what you think...",
		send: "Send",
		sending: "Sending...",
		sent: "Sent.",
		title: "Send feedback",
	},
	email: "feedback@xolaceinc.com",
	emailUs: "Email us",
	follow: "Follow Xolace",
	getHelp: "Get help now",
	gift: "🎁",
	helping: "Is Xolace helping?",
	review: "Leave us a review",
	reviewNote:
		"If Xolace has helped you sit with something heavy, a review helps others find it when they need it most.",
	/** Production's store per platform: the App Store on iOS, Google Play on Android. */
	reviewSub: { android: "Opens the Play Store", ios: "Opens the App Store" },
	sendFeedback: "Send feedback",
	/** Production's fallback when a failed send carries no message of its own. */
	somethingWrong: "Something went wrong",
	support: "Support",
	supportNote:
		"We read everything. If something feels too heavy right now, Get help now lists people you can call or text where you are.",
} as const;

/** Production's links (`enjoying-xolace-section.tsx`), unchanged. */
export const FOLLOW_LINKS = {
	mailBody:
		"Hi Xolace team,\n\nI have some feedback:\n\n[Your feedback here]\n\nThanks!",
	mailSubject: "Xolace Feedback",
} as const;

export type SocialId =
	| "web"
	| "instagram"
	| "tiktok"
	| "linkedin"
	| "snapchat"
	| "whatsapp";

/** Production's order and URLs (`follow-us-section.tsx`), with the boards' handles. */
export const SOCIAL: readonly {
	id: SocialId;
	label: string;
	handle: string;
	url: string;
}[] = [
	{
		handle: "xolaceinc.com",
		id: "web",
		label: "Website",
		url: "https://xolaceinc.com",
	},
	{
		handle: "@xolaceinc",
		id: "instagram",
		label: "Instagram",
		url: "https://www.instagram.com/xolaceinc",
	},
	{
		handle: "@talk.with.xolace",
		id: "tiktok",
		label: "TikTok",
		url: "https://www.tiktok.com/@talk.with.xolace",
	},
	{
		handle: "Xolace Inc",
		id: "linkedin",
		label: "LinkedIn",
		url: "https://www.linkedin.com/company/xolace-inc/",
	},
	{
		handle: "Xolace",
		id: "snapchat",
		label: "Snapchat",
		url: "https://snapchat.com/t/ooayya7k",
	},
	{
		handle: "Xolace",
		id: "whatsapp",
		label: "WhatsApp Channel",
		url: "https://whatsapp.com/channel/0029Vb68RgXGpLHPmY1pL73s",
	},
];

/** The Support rows' icons, with their Android twins. */
export const FOLLOW_ICONS = {
	email: { android: "mail", ios: "envelope" },
	feedback: { android: "chat_bubble", ios: "bubble.left" },
	help: { android: "favorite", ios: "heart" },
} as const satisfies Record<string, IconName>;
