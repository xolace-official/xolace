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

export const NOT_LINKED = [push({ isFirst: true }), telegram()];

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
