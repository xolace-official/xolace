import type { Doc } from "@xolace/backend/dataModel";
import {
	NOTIFY_COPY as C,
	REACH,
	type Reach,
} from "@/features/settings/notifications/copy";

export type NotificationPrefs = Doc<"preferences">["notifications"];

export const gentleRemindersOn = (prefs: NotificationPrefs | undefined) =>
	!!prefs?.enabled && prefs.gentleReturn;

export const chatChoice = (prefs: NotificationPrefs | undefined) =>
	prefs?.chat !== false;

export const gentleChoice = (prefs: NotificationPrefs | undefined) =>
	prefs?.gentleReturn ?? false;

export type DailyQuoteSlot = NonNullable<
	NotificationPrefs["dailyQuote"]
>["slot"];
export const DAILY_QUOTE_SLOTS: readonly DailyQuoteSlot[] = [
	"morning",
	"afternoon",
	"evening",
];
export const DAILY_QUOTE_DEFAULT_SLOT: DailyQuoteSlot = "morning";

export type DailyQuote = { on: boolean; slot: DailyQuoteSlot; paused: boolean };

export const dailyQuoteChoice = (prefs: NotificationPrefs | undefined) =>
	prefs?.dailyQuote?.enabled === true;

export function dailyQuoteOf(prefs: NotificationPrefs | undefined): DailyQuote {
	const setting = prefs?.dailyQuote;
	return {
		on: setting?.enabled === true,
		paused: setting?.enabled === false && setting.pausedAt !== undefined,
		slot: setting?.slot ?? DAILY_QUOTE_DEFAULT_SLOT,
	};
}

export const nextNotificationPrefs = (next: {
	gentle: boolean;
	chat: boolean;
}): NotificationPrefs => ({
	chat: next.chat,
	enabled: next.gentle || next.chat,
	gentleReturn: next.gentle,
	milestone: next.gentle,
	patternNudge: next.gentle,
});

export const reachOf = (reach: Reach | undefined) =>
	REACH.find((r) => r.id === reach) ?? REACH[0];

export type QuietWindow = { dontReachBefore: number; dontReachAfter: number };
export type Quiet = { after: number; before: number };

export const AFTER_HOURS = [19, 20, 21, 22, 23] as const;
export const BEFORE_HOURS = [5, 6, 7, 8, 9, 10] as const;
export const QUIET_DEFAULT: QuietWindow = {
	dontReachAfter: 21,
	dontReachBefore: 8,
};
export const SAMPLE_HOUR = 21.5;

const NOON = 12;
const DAY = 24;

export function hourLabel(hour: number): string {
	if (hour === NOON) {
		return "noon";
	}
	if (hour > NOON) {
		return `${hour - NOON} pm`;
	}
	return `${hour === 0 ? NOON : hour} am`;
}

export const toQuiet = (
	window: QuietWindow | null | undefined
): Quiet | null =>
	window
		? { after: window.dontReachAfter, before: window.dontReachBefore }
		: null;

export function quietWith(
	window: QuietWindow | null | undefined,
	end: "after" | "before",
	hour: number
): QuietWindow {
	return {
		dontReachAfter:
			end === "after"
				? hour
				: (window?.dontReachAfter ?? QUIET_DEFAULT.dontReachAfter),
		dontReachBefore:
			end === "before"
				? hour
				: (window?.dontReachBefore ?? QUIET_DEFAULT.dontReachBefore),
	};
}

export const quietNote = (quiet: Quiet | null) =>
	quiet
		? C.quietNote(hourLabel(quiet.after), hourLabel(quiet.before))
		: C.quietOffNote;

export const dayPercent = (hour: number) =>
	(((hour - NOON + DAY) % DAY) / DAY) * 100;

export function daySpan(quiet: Quiet): { left: number; width: number } {
	const left = dayPercent(quiet.after);
	return { left, width: (dayPercent(quiet.before) - left + 100) % 100 };
}

export type LockSample = {
	show: boolean;
	held: boolean;
	line: string;
	pill: { text: string; moon: boolean } | null;
	a11y: string;
};

export function lockSample(s: {
	loading: boolean;
	blocked: boolean;
	reminders: boolean;
	reach: Reach;
	quiet: Quiet | null;
}): LockSample {
	const { line } = reachOf(s.reach);
	if (s.loading) {
		return {
			a11y: C.sample.a11yOff,
			held: false,
			line,
			pill: null,
			show: false,
		};
	}
	if (!s.reminders) {
		return {
			a11y: C.sample.a11yOff,
			held: false,
			line,
			pill: {
				moon: false,
				text: s.blocked ? C.sample.nothing : C.sample.remindersOff,
			},
			show: false,
		};
	}
	const held = s.quiet !== null && s.quiet.after <= SAMPLE_HOUR;
	return {
		a11y: C.sample.a11y(line, held),
		held,
		line,
		pill:
			held && s.quiet
				? { moon: true, text: C.sample.held(hourLabel(s.quiet.before)) }
				: null,
		show: true,
	};
}
