import { chatNotificationsAllowed } from "@xolace/backend/convex/lib/chatNotifications";
import { describe, expect, it } from "vitest";
import {
	NOTIFY_DIRECT_10PM,
	NOTIFY_HELD,
} from "@/features/settings/notifications/dev/fixtures";
import {
	chatChoice,
	DAILY_QUOTE_DEFAULT_SLOT,
	dailyQuoteChoice,
	dailyQuoteOf,
	dayPercent,
	daySpan,
	gentleChoice,
	gentleRemindersOn,
	hourLabel,
	lockSample,
	type NotificationPrefs,
	nextNotificationPrefs,
	QUIET_DEFAULT,
	quietNote,
	quietWith,
	reachOf,
	toQuiet,
} from "@/features/settings/notifications/notifications-model";

const prefs = (
	partial: Partial<NotificationPrefs> = {}
): NotificationPrefs => ({
	enabled: true,
	gentleReturn: true,
	milestone: true,
	patternNudge: true,
	...partial,
});

const allOff = prefs({
	enabled: false,
	gentleReturn: false,
	milestone: false,
	patternNudge: false,
});

describe("gentleRemindersOn", () => {
	it("follows the nudge preference under the master", () => {
		expect(gentleRemindersOn(prefs())).toBe(true);
		expect(gentleRemindersOn(prefs({ gentleReturn: false }))).toBe(false);
		expect(gentleRemindersOn(prefs({ enabled: false }))).toBe(false);
		expect(gentleRemindersOn(undefined)).toBe(false);
	});
});

describe("stored choice vs delivered state", () => {
	it("keeps chat's absent-means-enabled default while the master is off", () => {
		expect(chatNotificationsAllowed(allOff)).toBe(false);
		expect(chatChoice(allOff)).toBe(true);
	});

	it("remembers an explicit mute through a master that is off", () => {
		expect(chatChoice(prefs({ chat: false, enabled: false }))).toBe(false);
	});

	it("does not invent a gentle preference the user never set", () => {
		expect(gentleChoice(allOff)).toBe(false);
		expect(gentleChoice(prefs())).toBe(true);
		expect(gentleChoice(undefined)).toBe(false);
	});
});

describe("nextNotificationPrefs", () => {
	it("keeps the master on while either family wants delivery", () => {
		expect(nextNotificationPrefs({ chat: true, gentle: false }).enabled).toBe(
			true
		);
		expect(nextNotificationPrefs({ chat: false, gentle: true }).enabled).toBe(
			true
		);
		expect(nextNotificationPrefs({ chat: false, gentle: false }).enabled).toBe(
			false
		);
	});

	it("never carries the daily quote: it's set on its own", () => {
		const next = nextNotificationPrefs({ chat: true, gentle: true });
		expect("dailyQuote" in next).toBe(false);
	});

	it("mutes chat without touching the AI nudges", () => {
		const next = nextNotificationPrefs({
			chat: false,
			gentle: true,
		});
		expect(next.chat).toBe(false);
		expect(next.gentleReturn).toBe(true);
		expect(next.patternNudge).toBe(true);
		expect(next.milestone).toBe(true);
	});

	it("mutes the AI nudges without touching chat", () => {
		const next = nextNotificationPrefs({
			chat: true,
			gentle: false,
		});
		expect(next.chat).toBe(true);
		expect(next.gentleReturn).toBe(false);
		expect(next.patternNudge).toBe(false);
		expect(next.milestone).toBe(false);
	});

	it("round-trips through the read helpers", () => {
		for (const gentle of [true, false]) {
			for (const chat of [true, false]) {
				const next = nextNotificationPrefs({ chat, gentle });
				expect(gentleRemindersOn(next)).toBe(gentle);
				expect(chatNotificationsAllowed(next)).toBe(chat);
			}
		}
	});

	it("says nothing about reach, quiet window, or timezone", () => {
		const next = nextNotificationPrefs({
			chat: true,
			gentle: false,
		});
		expect("reach" in next).toBe(false);
		expect("quietWindow" in next).toBe(false);
		expect("timezone" in next).toBe(false);
	});
});

const enableGentle = (p: NotificationPrefs) =>
	nextNotificationPrefs({ chat: chatChoice(p), gentle: true });
const enableChat = (p: NotificationPrefs) =>
	nextNotificationPrefs({ chat: true, gentle: gentleChoice(p) });

describe("toggling one family from a cold start", () => {
	it("leaves chat on when a fresh user turns on gentle reminders", () => {
		expect(chatNotificationsAllowed(enableGentle(allOff))).toBe(true);
	});

	it("still respects a chat mute made before everything went quiet", () => {
		const muted = prefs({
			chat: false,
			enabled: false,
			gentleReturn: false,
			milestone: false,
			patternNudge: false,
		});
		expect(chatNotificationsAllowed(enableGentle(muted))).toBe(false);
	});

	it("does not switch on AI nudges when a fresh user turns on chat", () => {
		expect(gentleRemindersOn(enableChat(allOff))).toBe(false);
		expect(chatNotificationsAllowed(enableChat(allOff))).toBe(true);
	});

	it("keeps AI nudges on when chat is re-enabled beside them", () => {
		const chatMuted = prefs({ chat: false });
		expect(gentleRemindersOn(enableChat(chatMuted))).toBe(true);
	});
});

describe("reach", () => {
	it("defaults to warm and carries each voice's fixed line", () => {
		expect(reachOf(undefined).id).toBe("warm");
		expect(reachOf("direct").label).toBe("Direct");
		expect(reachOf("quiet").line).toBe("Still here, if tonight’s heavy.");
	});
});

describe("quiet hours", () => {
	it("names hours as the board does", () => {
		expect(hourLabel(21)).toBe("9 pm");
		expect(hourLabel(8)).toBe("8 am");
		expect(hourLabel(12)).toBe("noon");
		expect(hourLabel(0)).toBe("12 am");
	});

	it("reads production's window as after and before", () => {
		expect(toQuiet({ dontReachAfter: 22, dontReachBefore: 7 })).toEqual({
			after: 22,
			before: 7,
		});
		expect(toQuiet(null)).toBeNull();
		expect(toQuiet(undefined)).toBeNull();
	});

	it("switches on at production's 9 pm to 8 am", () => {
		expect(QUIET_DEFAULT).toEqual({ dontReachAfter: 21, dontReachBefore: 8 });
	});

	it("moves one end and keeps the other, or production's default", () => {
		const window = { dontReachAfter: 22, dontReachBefore: 6 };
		expect(quietWith(window, "after", 20)).toEqual({
			dontReachAfter: 20,
			dontReachBefore: 6,
		});
		expect(quietWith(window, "before", 9)).toEqual({
			dontReachAfter: 22,
			dontReachBefore: 9,
		});
		expect(quietWith(null, "before", 9)).toEqual({
			dontReachAfter: 21,
			dontReachBefore: 9,
		});
		expect(quietWith(undefined, "after", 23)).toEqual({
			dontReachAfter: 23,
			dontReachBefore: 8,
		});
	});

	it("words the footnote for on and off", () => {
		expect(quietNote(NOTIFY_HELD.quiet)).toBe(
			"No reminders between 9 pm and 8 am. One that’s due waits until morning."
		);
		expect(quietNote(null)).toBe("Reminders can arrive at any hour.");
	});

	it("places the span on a noon-to-noon day", () => {
		expect(dayPercent(12)).toBe(0);
		expect(dayPercent(0)).toBe(50);
		expect(daySpan({ after: 21, before: 8 })).toEqual({
			left: 37.5,
			width: (20 / 24) * 100 - 37.5,
		});
		expect(daySpan({ after: 2, before: 13 }).width).toBeCloseTo(
			(11 / 24) * 100
		);
	});
});

describe("lockSample", () => {
	const base = {
		blocked: false,
		loading: false,
		quiet: NOTIFY_HELD.quiet,
		reach: "warm" as const,
		reminders: true,
	};

	it("is held when quiet hours start by 9:30 pm", () => {
		const sample = lockSample(base);
		expect(sample).toMatchObject({
			held: true,
			pill: { moon: true, text: "Held until 8 am · quiet hours" },
			show: true,
		});
		expect(sample.a11y).toBe(
			"A sample reminder: Sunday evenings have asked a lot of you lately. There’s room tonight if you want it. Held until morning by quiet hours."
		);
		expect(lockSample({ ...base, quiet: { after: 19, before: 6 } }).held).toBe(
			true
		);
	});

	it("is delivered when quiet hours start after it, or are off", () => {
		const late = lockSample({ ...base, quiet: NOTIFY_DIRECT_10PM.quiet });
		expect(late).toMatchObject({ held: false, pill: null, show: true });
		expect(late.a11y).not.toContain("Held");
		expect(lockSample({ ...base, quiet: null }).held).toBe(false);
	});

	it("says reminders are off, or that nothing can reach you on a blocked phone", () => {
		expect(lockSample({ ...base, reminders: false })).toMatchObject({
			a11y: "No reminders",
			pill: { moon: false, text: "Gentle reminders are off" },
			show: false,
		});
		expect(
			lockSample({ ...base, blocked: true, reminders: false }).pill?.text
		).toBe("Nothing can reach you right now");
	});

	it("shows only the clock while preferences load", () => {
		expect(lockSample({ ...base, loading: true })).toMatchObject({
			pill: null,
			show: false,
		});
	});

	it("writes the chosen voice's line", () => {
		expect(lockSample({ ...base, reach: "direct" }).line).toBe(
			"Sunday nights are usually when it piles up for you. Tonight might be one of them."
		);
	});
});

describe("the daily quote", () => {
	it("is off and in the morning until someone chooses", () => {
		expect(dailyQuoteOf(prefs())).toEqual({
			on: false,
			paused: false,
			slot: DAILY_QUOTE_DEFAULT_SLOT,
		});
		expect(dailyQuoteChoice(undefined)).toBe(false);
	});

	it("shows on, at its time", () => {
		const p = prefs({ dailyQuote: { enabled: true, slot: "evening" } });
		expect(dailyQuoteOf(p)).toEqual({
			on: true,
			paused: false,
			slot: "evening",
		});
		expect(dailyQuoteChoice(p)).toBe(true);
	});

	it("stays on with the master off: it has its own switch", () => {
		const p = prefs({
			dailyQuote: { enabled: true, slot: "evening" },
			enabled: false,
		});
		expect(dailyQuoteOf(p).on).toBe(true);
		expect(dailyQuoteChoice(p)).toBe(true);
	});

	it("says when the backoff paused it", () => {
		const p = prefs({
			dailyQuote: { enabled: false, pausedAt: 1, slot: "afternoon" },
		});
		expect(dailyQuoteOf(p)).toEqual({
			on: false,
			paused: true,
			slot: "afternoon",
		});
	});
});
