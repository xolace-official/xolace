import { describe, expect, it } from "vitest";
import type { ChannelEntry } from "@/features/reach-me-on/reach-view";
import {
	type OfferContext,
	telegramOfferVisible,
} from "@/features/reach-me-on/telegram-offer";

const telegram = (over: Partial<ChannelEntry> = {}): ChannelEntry => ({
	available: true,
	channel: "telegram",
	isFirst: false,
	linked: false,
	requiresPlus: false,
	status: "not_linked",
	...over,
});
const push: ChannelEntry = {
	available: true,
	channel: "push",
	isFirst: true,
	linked: true,
	requiresPlus: false,
	status: "linked",
};

const base: OfferContext = {
	answer: "lighter",
	channels: [push, telegram()],
	dismissed: false,
	escalationDerived: false,
	flagOn: true,
	tier: "standard",
};

describe("telegramOfferVisible", () => {
	it("shows after a lighter or still-with-it answer", () => {
		expect(telegramOfferVisible(base)).toBe(true);
		expect(telegramOfferVisible({ ...base, answer: "still_here" })).toBe(true);
		expect(telegramOfferVisible({ ...base, tier: "elevated" })).toBe(true);
	});

	it("never shows after heavier or any other answer", () => {
		for (const answer of ["heavier", "processed", "vent", null] as const) {
			expect(telegramOfferVisible({ ...base, answer })).toBe(false);
		}
	});

	it("never shows on an acute or crisis (escalation-derived) card", () => {
		expect(telegramOfferVisible({ ...base, tier: "acute" })).toBe(false);
		expect(telegramOfferVisible({ ...base, escalationDerived: true })).toBe(
			false
		);
	});

	it("stays hidden once dismissed, or with the flag off or still loading", () => {
		expect(telegramOfferVisible({ ...base, dismissed: true })).toBe(false);
		expect(telegramOfferVisible({ ...base, flagOn: false })).toBe(false);
		expect(telegramOfferVisible({ ...base, flagOn: undefined })).toBe(false);
	});

	it("hides while channels load, or where the deployment offers no Telegram", () => {
		expect(telegramOfferVisible({ ...base, channels: undefined })).toBe(false);
		expect(telegramOfferVisible({ ...base, channels: [push] })).toBe(false);
	});

	it("hides when Telegram is already linked, paused or needs Xolace+", () => {
		for (const entry of [
			telegram({ linked: true, status: "linked" }),
			telegram({ linked: true, status: "paused" }),
			telegram({ requiresPlus: true, status: "needs_plus" }),
			telegram({ available: false }),
		]) {
			expect(telegramOfferVisible({ ...base, channels: [push, entry] })).toBe(
				false
			);
		}
	});

	// It's for finding Telegram; someone who linked once already has, and may
	// have stopped or blocked the bot on purpose.
	it("never shows to someone who linked before", () => {
		for (const revokedReason of [
			"blocked",
			"user_telegram",
			"user_app",
		] as const) {
			const entry = telegram({ revokedReason, status: "disconnected" });
			expect(telegramOfferVisible({ ...base, channels: [push, entry] })).toBe(
				false
			);
		}
	});
});
