import type { api } from "@xolace/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

/** One channel as `outreach.reachMe.listChannels` describes it. */
export type ChannelEntry = FunctionReturnType<
	typeof api.outreach.reachMe.listChannels
>[number];

export type Channel = ChannelEntry["channel"];

/** A card's place in the order; see `orderMark`. */
export type OrderMark = "first" | "try_first" | null;

export const CHANNEL_NAME: Record<Channel, string> = {
	push: "Notifications",
	telegram: "Telegram",
};

/**
 * The channels in the order the sheet shows them: Telegram first (#733),
 * then the rest as `listChannels` returns them.
 */
export function sheetOrder(entries: readonly ChannelEntry[]): ChannelEntry[] {
	return [
		...entries.filter((e) => e.channel === "telegram"),
		...entries.filter((e) => e.channel !== "telegram"),
	];
}

/**
 * The "Reach me on…" row's value: where check-ins go now. Telegram only when
 * it is linked, active and the channel routing tries first.
 */
export function reachRowValue(
	entries: readonly ChannelEntry[] | undefined
): string {
	const first = entries?.find((e) => e.isFirst);
	return CHANNEL_NAME[
		first?.channel === "telegram" && first.status === "linked"
			? "telegram"
			: "push"
	];
}

export type TelegramAction =
	| "link"
	| "link_again"
	| "pause"
	| "resume"
	| "unlink"
	| "get_plus";

/** What the Telegram card shows for one `listChannels` state. */
export type TelegramCardView = {
	kind: "not_linked" | "linked" | "paused" | "needs_plus" | "disconnected";
	actions: TelegramAction[];
	statusLine?: string;
	description?: string;
	warning?: string;
	plusBadge?: true;
};

type RevokedReason = NonNullable<ChannelEntry["revokedReason"]>;

/**
 * Why a chat came unlinked, when it wasn't the person unlinking from the app
 * (or deleting their account): those read as plain "not linked".
 */
const DISCONNECTED_WARNING: Partial<Record<RevokedReason, string>> = {
	blocked: "Telegram disconnected: the bot was blocked.",
	relinked: "Telegram disconnected: this chat was linked to another account.",
	unreachable: "Telegram disconnected: Xolace couldn't reach this chat.",
	user_telegram: "Telegram disconnected: you sent /stop.",
};

const NOT_LINKED: TelegramCardView = {
	actions: ["link"],
	description:
		"Get check-ins as a Telegram message. Answer with a tap, or just write back.",
	kind: "not_linked",
};

function withHandle(label: string, handle: string | undefined): string {
	return handle ? `${label} · @${handle}` : label;
}

export function telegramCard(entry: ChannelEntry): TelegramCardView {
	switch (entry.status) {
		case "linked":
			return {
				actions: ["pause", "unlink"],
				kind: "linked",
				statusLine: withHandle("Linked", entry.displayHandle),
				// Switched off for everyone (the kill switch), not for this person.
				...(!entry.available && {
					description:
						"Telegram check-ins are off for now. Your link is kept; check-ins come as notifications.",
				}),
			};
		case "paused":
			return {
				actions: ["resume", "unlink"],
				kind: "paused",
				statusLine: withHandle("Paused", entry.displayHandle),
			};
		case "needs_plus":
			return {
				actions: ["get_plus"],
				description: entry.linked
					? "Telegram is now part of Xolace+. Your link is kept; check-ins come as notifications until you're on Xolace+."
					: "Telegram check-ins are part of Xolace+.",
				kind: "needs_plus",
				plusBadge: true,
			};
		case "disconnected": {
			const warning =
				entry.revokedReason && DISCONNECTED_WARNING[entry.revokedReason];
			return warning
				? { actions: ["link_again"], kind: "disconnected", warning }
				: NOT_LINKED;
		}
		default:
			return NOT_LINKED;
	}
}

/**
 * The card's place in the order: **First** on the channel routing tries
 * first, **Try this first** on another one that is linked and open now.
 */
export function orderMark(entry: ChannelEntry): OrderMark {
	if (entry.isFirst) {
		return "first";
	}
	return entry.status === "linked" && entry.available ? "try_first" : null;
}
