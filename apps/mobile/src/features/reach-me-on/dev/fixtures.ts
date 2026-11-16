/** `listChannels` entries for the sheet's tests and dev states, with the
 * server's defaults: push linked and open, Telegram never linked. */
import type { ChannelEntry } from "@/features/reach-me-on/reach-view";

export const push = (partial: Partial<ChannelEntry> = {}): ChannelEntry => ({
	available: true,
	channel: "push",
	isFirst: false,
	linked: true,
	requiresPlus: false,
	status: "linked",
	...partial,
});

export const telegram = (
	partial: Partial<ChannelEntry> = {}
): ChannelEntry => ({
	available: true,
	channel: "telegram",
	isFirst: false,
	linked: false,
	requiresPlus: false,
	status: "not_linked",
	...partial,
});

/** Nothing linked: push carries the check-ins. */
export const NOT_LINKED = [push({ isFirst: true }), telegram()];

/** Telegram linked, open, and tried first. */
export const LINKED = [
	telegram({
		displayHandle: "river_stone",
		everLinked: true,
		isFirst: true,
		linked: true,
		status: "linked",
	}),
	push(),
];

/** A kept link after Telegram became Xolace+-only. */
export const NEEDS_PLUS = [
	push({ isFirst: true }),
	telegram({
		available: false,
		everLinked: true,
		linked: true,
		requiresPlus: true,
		status: "needs_plus",
	}),
];
