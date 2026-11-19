/** Settings › Notifications: what the preferences mean and what the screen shows. Pure. */
import type { Doc } from "@xolace/backend/dataModel";
import {
	NOTIFY_COPY as C,
	REACH,
	type Reach,
} from "@/features/settings/notifications/copy";

export type NotificationPrefs = Doc<"preferences">["notifications"];

/* ── The two families (production's `notification-prefs.ts`) ───────────────────────────── */

/** Gentle reminders and chat notifications share one OS permission and one push
 * token; `enabled` is the master, on while at least one family wants delivery. */

/** Whether the AI reaches out: the master flag plus this family's own flag. */
export const gentleRemindersOn = (prefs: NotificationPrefs | undefined) =>
	!!prefs?.enabled && prefs.gentleReturn;

/** What the user last chose for a family, ignoring the master. Absent `chat`
 * means enabled; never feed a displayed (master-masked) value back here. */
export const chatChoice = (prefs: NotificationPrefs | undefined) =>
	prefs?.chat !== false;

export const gentleChoice = (prefs: NotificationPrefs | undefined) =>
	prefs?.gentleReturn ?? false;

/* ── The daily quote (B19) ───────────────────────────────────────────────────────────── */

export type DailyQuoteSlot = NonNullable<
	NotificationPrefs["dailyQuote"]
>["slot"];
export const DAILY_QUOTE_SLOTS: readonly DailyQuoteSlot[] = [
	"morning",
	"afternoon",
	"evening",
];
/** The time it comes when nobody picked one: production's old reminder default. */
export const DAILY_QUOTE_DEFAULT_SLOT: DailyQuoteSlot = "morning";

/** As shown: on, when, and whether the backoff paused it after quotes went unopened. */
export type DailyQuote = { on: boolean; slot: DailyQuoteSlot; paused: boolean };

/** What the user chose. Absent = never chosen, which is off. */
export const dailyQuoteChoice = (prefs: NotificationPrefs | undefined) =>
	prefs?.dailyQuote?.enabled === true;

/** Its own switch, apart from the master: the server sends it whatever `enabled` says, so
 * turning it on wakes no other kind and turning the others off never silences it. */
export function dailyQuoteOf(prefs: NotificationPrefs | undefined): DailyQuote {
	const setting = prefs?.dailyQuote;
	return {
		on: setting?.enabled === true,
		paused: setting?.enabled === false && setting.pausedAt !== undefined,
		slot: setting?.slot ?? DAILY_QUOTE_DEFAULT_SLOT,
	};
}

/** The toggle fields only. Carries no `reach`, `quietWindow`, `timezone` or `dailyQuote`: the
 * server merges writes, and echoing a stale snapshot would erase newer values. The master covers
 * gentle reminders and chat; the daily quote has its own switch. */
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

/* ── Reach ───────────────────────────────────────────────────────────────────────────── */

/** The chosen voice; production's default is warm. */
export const reachOf = (reach: Reach | undefined) =>
	REACH.find((r) => r.id === reach) ?? REACH[0];

/* ── Quiet hours ─────────────────────────────────────────────────────────────────────── */

/** Production's stored shape: `dontReachAfter` (evening) and `dontReachBefore` (morning). */
export type QuietWindow = { dontReachBefore: number; dontReachAfter: number };
/** The screen's: `after` is the evening hour, `before` the morning one. */
export type Quiet = { after: number; before: number };

export const AFTER_HOURS = [19, 20, 21, 22, 23] as const;
export const BEFORE_HOURS = [5, 6, 7, 8, 9, 10] as const;
/** Production's window when quiet hours switch on: 9 pm to 8 am. */
export const QUIET_DEFAULT: QuietWindow = {
	dontReachAfter: 21,
	dontReachBefore: 8,
};
/** The sample reminder is due at 9:30 pm. */
export const SAMPLE_HOUR = 21.5;

const NOON = 12;
const DAY = 24;

/** 21 → "9 pm", 8 → "8 am", 12 → "noon". */
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

/** One end moved; the other keeps its stored hour, or production's default when none. */
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

/** Where an hour sits on the day bar, which runs noon to noon, in percent. */
export const dayPercent = (hour: number) =>
	(((hour - NOON + DAY) % DAY) / DAY) * 100;

/** The quiet span on the day bar, in percent from the left. */
export function daySpan(quiet: Quiet): { left: number; width: number } {
	const left = dayPercent(quiet.after);
	return { left, width: (dayPercent(quiet.before) - left + 100) % 100 };
}

/* ── The lock-screen sample ──────────────────────────────────────────────────────────── */

export type LockSample = {
	/** The reminder bubble is drawn (reminders can reach you). */
	show: boolean;
	/** Quiet hours cover 9:30 pm: the bubble fades back. */
	held: boolean;
	line: string;
	/** The pill over the clock, if any. */
	pill: { text: string; moon: boolean } | null;
	a11y: string;
};

/**
 * Held when reminders are on, quiet hours are on and start by 9:30 pm. While preferences load
 * the card shows only its clock, so it never flashes "off" first.
 */
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
