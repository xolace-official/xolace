/** Settings › Notifications on fixtures: the board's account (Warm, quiet 9 pm–8 am, chat on). */
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

/** Render 17: Warm, held by quiet hours 9 pm–8 am. */
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

/** Render 18: Direct, quiet from 10 pm, so the 9:30 pm sample is delivered. */
export const NOTIFY_DIRECT_10PM: State = {
	...NOTIFY_HELD,
	quiet: { after: 22, before: 8 },
	reach: "direct",
};

export const NOTIFY_QUIET_VOICE: State = { ...NOTIFY_HELD, reach: "quiet" };

/** Quiet hours off: nothing holds the sample. */
export const NOTIFY_QUIET_OFF: State = { ...NOTIFY_HELD, quiet: null };

/** Reminders off: How I reach out and Quiet hours hide, the pill says so. */
export const NOTIFY_REMINDERS_OFF: State = { ...NOTIFY_HELD, reminders: false };

/** The daily quote off: the time choice hides. */
export const NOTIFY_DAILY_QUOTE_OFF: State = {
	...NOTIFY_HELD,
	dailyQuote: { on: false, paused: false, slot: "morning" },
};

/** The daily quote paused by its backoff after quotes went unopened. */
export const NOTIFY_DAILY_QUOTE_PAUSED: State = {
	...NOTIFY_HELD,
	dailyQuote: { on: false, paused: true, slot: "evening" },
};

/** Letters' pushes off (on by default, apart from Privacy › Receive letters). */
export const NOTIFY_LETTERS_OFF: State = { ...NOTIFY_HELD, letters: false };

/** Render 20: the phone blocks notifications; both switches read off. */
export const NOTIFY_BLOCKED: State = {
	...NOTIFY_HELD,
	blocked: true,
	chat: false,
	dailyQuote: { on: false, paused: false, slot: "morning" },
	letters: false,
	reminders: false,
};

/** A switch tapped on a blocked phone: production's alert. */
export const NOTIFY_BLOCKED_ALERT: State = {
	...NOTIFY_BLOCKED,
	alertOpen: true,
};

/** Check-ins shown (`reach-me-on` on): check-ins go to Telegram, linked and first. */
export const NOTIFY_REACH_TELEGRAM: State = {
	...NOTIFY_HELD,
	reachMeOn: { value: "Telegram" },
};

/** Check-ins shown, Telegram not linked: they come as notifications. */
export const NOTIFY_REACH_PUSH: State = {
	...NOTIFY_HELD,
	reachMeOn: { value: "Notifications" },
};

/** Preferences still loading: the clock alone, switches off. */
export const NOTIFY_LOADING: State = {
	...NOTIFY_HELD,
	chat: false,
	letters: null,
	loading: true,
	quiet: null,
	reminders: false,
};
