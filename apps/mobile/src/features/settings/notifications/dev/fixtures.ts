import type { Notifications } from "@/features/settings/notifications/notifications-data";

const ignore = () => undefined;

export const NOTIFY_ACTIONS: Notifications["actions"] = {
	closeAlert: ignore,
	openReachMeOn: ignore,
	openSettings: ignore,
	setChat: ignore,
	setDailyQuote: ignore,
	setDailyQuoteSlot: ignore,
	setLetters: ignore,
	setQuiet: ignore,
	setQuietHour: ignore,
	setReach: ignore,
	setReminders: ignore,
};

type State = Notifications["state"];

export const NOTIFY_HELD: State = {
	alertOpen: false,
	blocked: false,
	chat: true,
	dailyQuote: { on: true, paused: false, slot: "morning" },
	letters: true,
	loading: false,
	quiet: { after: 21, before: 8 },
	reach: "warm",
	reachMeOn: null,
	reminders: true,
};

export const NOTIFY_DIRECT_10PM: State = {
	...NOTIFY_HELD,
	quiet: { after: 22, before: 8 },
	reach: "direct",
};

export const NOTIFY_QUIET_VOICE: State = { ...NOTIFY_HELD, reach: "quiet" };

export const NOTIFY_QUIET_OFF: State = { ...NOTIFY_HELD, quiet: null };

export const NOTIFY_REMINDERS_OFF: State = { ...NOTIFY_HELD, reminders: false };

export const NOTIFY_DAILY_QUOTE_OFF: State = {
	...NOTIFY_HELD,
	dailyQuote: { on: false, paused: false, slot: "morning" },
};

export const NOTIFY_DAILY_QUOTE_PAUSED: State = {
	...NOTIFY_HELD,
	dailyQuote: { on: false, paused: true, slot: "evening" },
};

export const NOTIFY_LETTERS_OFF: State = { ...NOTIFY_HELD, letters: false };

export const NOTIFY_BLOCKED: State = {
	...NOTIFY_HELD,
	blocked: true,
	chat: false,
	dailyQuote: { on: false, paused: false, slot: "morning" },
	letters: false,
	reminders: false,
};

export const NOTIFY_BLOCKED_ALERT: State = {
	...NOTIFY_BLOCKED,
	alertOpen: true,
};

export const NOTIFY_REACH_TELEGRAM: State = {
	...NOTIFY_HELD,
	reachMeOn: { value: "Telegram" },
};

export const NOTIFY_REACH_PUSH: State = {
	...NOTIFY_HELD,
	reachMeOn: { value: "Notifications" },
};

export const NOTIFY_LOADING: State = {
	...NOTIFY_HELD,
	chat: false,
	letters: null,
	loading: true,
	quiet: null,
	reminders: false,
};
