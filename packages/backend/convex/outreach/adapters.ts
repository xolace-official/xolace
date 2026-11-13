import type { Workpool } from "@convex-dev/workpool";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { outreachPushPool } from "./pools";
import { pushAdapter } from "./push";
import type { ChannelErrorKind, OutreachChannel } from "./validators";

/**
 * The adapter seam (#760). An adapter delivers one outreach on one channel
 * and writes no copy: the outreach carries it. It throws a `ChannelError`
 * when it can't: `retry` (try again after `afterMs`), `permanent` (give up,
 * fall back once) or `unreachable` (the person can't be reached there; fall
 * back once).
 */
export type ChannelAdapter = {
	channel: OutreachChannel;
	/** `pull` (the client fetches, e.g. a CLI) is reserved; none is built. */
	deliveryMode: "push" | "pull";
	/** Whether this deployment can use the channel at all (a bot token…). */
	configured: () => boolean;
	pool: Workpool;
	send: (
		ctx: MutationCtx,
		delivery: Doc<"outreach_deliveries">,
		outreach: Doc<"outreach">
	) => Promise<DeliveryReceipt>;
};

/** What a successful send leaves on the delivery row. */
export type DeliveryReceipt = {
	notificationLogId?: Doc<"outreach_deliveries">["notificationLogId"];
	providerChatId?: string;
	providerMessageId?: string;
};

export class ChannelError extends Error {
	readonly kind: ChannelErrorKind;
	/** For `retry`: how long to wait. */
	readonly afterMs?: number;
	/** A provider code (an HTTP status, Telegram's `error_code`); never raw text. */
	readonly code?: string;

	constructor(
		kind: ChannelErrorKind,
		options: { afterMs?: number; code?: string; message?: string } = {}
	) {
		super(options.message ?? `Channel error: ${kind}`);
		this.name = "ChannelError";
		this.kind = kind;
		this.afterMs = options.afterMs;
		this.code = options.code;
	}
}

/** Channels with an adapter. A channel missing here is `not_configured`. */
export const ADAPTERS: Partial<Record<OutreachChannel, ChannelAdapter>> = {
	push: { ...pushAdapter, pool: outreachPushPool },
};
