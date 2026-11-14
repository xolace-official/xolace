import { describe, expect, it } from "vitest";
import {
	type ChannelEntry,
	orderMark,
	reachRowValue,
	sheetOrder,
	telegramCard,
} from "@/features/reach-me-on/reach-view";

const push = (partial: Partial<ChannelEntry> = {}): ChannelEntry => ({
	available: true,
	channel: "push",
	isFirst: false,
	linked: true,
	requiresPlus: false,
	status: "linked",
	...partial,
});

const telegram = (partial: Partial<ChannelEntry> = {}): ChannelEntry => ({
	available: true,
	channel: "telegram",
	isFirst: false,
	linked: false,
	requiresPlus: false,
	status: "not_linked",
	...partial,
});

describe("reachRowValue", () => {
	it("says Telegram when Telegram is linked, active and first", () => {
		expect(
			reachRowValue([
				telegram({ isFirst: true, linked: true, status: "linked" }),
				push(),
			])
		).toBe("Telegram");
	});

	it("says Notifications when Telegram is linked but not first", () => {
		expect(
			reachRowValue([
				push({ isFirst: true }),
				telegram({ linked: true, status: "linked" }),
			])
		).toBe("Notifications");
	});

	it("says Notifications when Telegram is paused", () => {
		expect(
			reachRowValue([
				telegram({ linked: true, status: "paused" }),
				push({ isFirst: true }),
			])
		).toBe("Notifications");
	});

	it("says Notifications while the channels load", () => {
		expect(reachRowValue(undefined)).toBe("Notifications");
	});
});

describe("telegramCard", () => {
	it("offers to link when not linked", () => {
		expect(telegramCard(telegram())).toEqual({
			actions: ["link"],
			description:
				"Get check-ins as a Telegram message. Answer with a tap, or just write back.",
			kind: "not_linked",
		});
	});

	it("shows the handle with Pause and Unlink when linked", () => {
		expect(
			telegramCard(
				telegram({ displayHandle: "sam", linked: true, status: "linked" })
			)
		).toEqual({
			actions: ["pause", "unlink"],
			kind: "linked",
			statusLine: "Linked · @sam",
		});
	});

	it("says check-ins are off when a linked chat's channel is switched off", () => {
		expect(
			telegramCard(
				telegram({
					available: false,
					displayHandle: "sam",
					linked: true,
					status: "linked",
				})
			)
		).toEqual({
			actions: ["pause", "unlink"],
			description:
				"Telegram check-ins are off for now. Your link is kept; check-ins come as notifications.",
			kind: "linked",
			statusLine: "Linked · @sam",
		});
	});

	it("says just Linked when the chat has no handle", () => {
		expect(
			telegramCard(telegram({ linked: true, status: "linked" })).statusLine
		).toBe("Linked");
	});

	it("offers Resume and Unlink when paused", () => {
		expect(
			telegramCard(
				telegram({ displayHandle: "sam", linked: true, status: "paused" })
			)
		).toEqual({
			actions: ["resume", "unlink"],
			kind: "paused",
			statusLine: "Paused · @sam",
		});
	});

	it("keeps the link and sells Xolace+ when a linked chat needs Plus", () => {
		expect(
			telegramCard(
				telegram({
					available: false,
					linked: true,
					requiresPlus: true,
					status: "needs_plus",
				})
			)
		).toEqual({
			actions: ["get_plus"],
			description:
				"Telegram is now part of Xolace+. Your link is kept; check-ins come as notifications until you're on Xolace+.",
			kind: "needs_plus",
			plusBadge: true,
		});
	});

	it("sells Xolace+ without a kept link when nothing was linked", () => {
		expect(
			telegramCard(
				telegram({ available: false, requiresPlus: true, status: "needs_plus" })
			).description
		).toBe("Telegram check-ins are part of Xolace+.");
	});

	it.each([
		["blocked", "Telegram disconnected: the bot was blocked."],
		["user_telegram", "Telegram disconnected: you sent /stop."],
		[
			"relinked",
			"Telegram disconnected: this chat was linked to another account.",
		],
		["unreachable", "Telegram disconnected: Xolace couldn't reach this chat."],
	] as const)("warns why it disconnected (%s)", (revokedReason, warning) => {
		expect(
			telegramCard(telegram({ revokedReason, status: "disconnected" }))
		).toEqual({ actions: ["link_again"], kind: "disconnected", warning });
	});

	it("treats an unlink from the app as not linked", () => {
		expect(
			telegramCard(
				telegram({ revokedReason: "user_app", status: "disconnected" })
			).kind
		).toBe("not_linked");
	});
});

describe("orderMark", () => {
	it("marks the channel routing tries first", () => {
		expect(orderMark(push({ isFirst: true }))).toBe("first");
	});

	it("offers Try this first on another usable channel", () => {
		expect(orderMark(telegram({ linked: true, status: "linked" }))).toBe(
			"try_first"
		);
		expect(orderMark(push())).toBe("try_first");
	});

	it("offers nothing on a channel that can't be used now", () => {
		expect(orderMark(telegram({ linked: true, status: "paused" }))).toBeNull();
		expect(orderMark(telegram())).toBeNull();
		expect(orderMark(push({ available: false, status: "linked" }))).toBeNull();
	});
});

describe("sheetOrder", () => {
	it("puts Telegram first whatever the routing order", () => {
		expect(
			sheetOrder([push({ isFirst: true }), telegram()]).map((e) => e.channel)
		).toEqual(["telegram", "push"]);
	});

	it("shows push alone where the deployment offers no Telegram", () => {
		expect(sheetOrder([push()]).map((e) => e.channel)).toEqual(["push"]);
	});
});
