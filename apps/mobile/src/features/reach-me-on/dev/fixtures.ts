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
