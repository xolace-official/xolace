import { chatNotificationsAllowed } from "@xolace/backend/convex/lib/chatNotifications";
import { describe, expect, it } from "vitest";
import {
	chatChoice,
	gentleChoice,
	gentleRemindersOn,
	type NotificationPrefs,
	nextNotificationPrefs,
} from "@/features/settings/notification-prefs";

const prefs = (
	partial: Partial<NotificationPrefs> = {}
): NotificationPrefs => ({
	enabled: true,
	gentleReturn: true,
	milestone: true,
	patternNudge: true,
	...partial,
});

/** All off: what a user who has never granted permission looks like. */
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
		expect(chatNotificationsAllowed(allOff)).toBe(false); // delivers nothing
		expect(chatChoice(allOff)).toBe(true); // but was never muted
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

	it("mutes chat without touching the AI nudges", () => {
		const next = nextNotificationPrefs({ chat: false, gentle: true });
		expect(next.chat).toBe(false);
		expect(next.gentleReturn).toBe(true);
		expect(next.patternNudge).toBe(true);
		expect(next.milestone).toBe(true);
	});

	it("mutes the AI nudges without touching chat", () => {
		const next = nextNotificationPrefs({ chat: true, gentle: false });
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

	// The server merges notification writes; an echoed stale value erased the
	// timezone `applyToggles` had just synced.
	it("says nothing about reach, quiet window, or timezone", () => {
		const next = nextNotificationPrefs({ chat: true, gentle: false });
		expect("reach" in next).toBe(false);
		expect("quietWindow" in next).toBe(false);
		expect("timezone" in next).toBe(false);
	});
});

/** Runs the same composition the settings hook uses, not the pieces alone. */
const enableGentle = (p: NotificationPrefs) =>
	nextNotificationPrefs({ chat: chatChoice(p), gentle: true });
const enableChat = (p: NotificationPrefs) =>
	nextNotificationPrefs({ chat: true, gentle: gentleChoice(p) });

describe("toggling one family from a cold start", () => {
	it("leaves chat on when a fresh user turns on gentle reminders", () => {
		// Absent means enabled: granting permission for one gets the other.
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
