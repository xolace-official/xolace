import type { Workpool } from "@convex-dev/workpool";
import type { Value } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";
import { outreachPushPool, outreachTelegramPool } from "./pools";
import { pushAdapter } from "./push";
import { telegramAdapter } from "./telegram/adapter";
import type { ChannelErrorKind, OutreachChannel } from "./validators";

/**
 * The adapter seam (#760). An adapter delivers one outreach on one channel
 * and writes no copy: the outreach carries it. It throws a `ChannelError`
 * when it can't: `retry` (try again after `afterMs`), `permanent` (give up,
 * fall back once) or `unreachable` (the person can't be reached there; fall
 * back once).
 *
 * A channel whose provider is a database write (push, through its component)
 * sends inside the delivery mutation. One that calls an outside API (Telegram)
 * runs as an action: `prepare` decides what to send inside the mutation that
 * claims the delivery, and `send` makes the call.
 */
type AdapterBase = {
	channel: OutreachChannel;
	/** `pull` (the client fetches, e.g. a CLI) is reserved; none is built. */
	deliveryMode: "push" | "pull";
	/** Whether this deployment can use the channel at all (a bot token…). */
	configured: (ctx: QueryCtx) => boolean | Promise<boolean>;
	pool: Workpool;
	/**
	 * After the send is recorded, in the same transaction. `sentSince` is when
	 * the send began, for an action adapter.
	 */
	afterSent?: (
		ctx: MutationCtx,
		deliveryId: Id<"outreach_deliveries">,
		sentSince?: number
	) => Promise<void>;
	/**
	 * A send that went out after its delivery row was removed (a wipe or
	 * account deletion drained it meanwhile): the message is still out there.
	 */
	afterLost?: (
		ctx: MutationCtx,
		receipt: { providerChatId?: string; providerMessageId?: string },
		sentSince: number
	) => Promise<void>;
};

export type MutationAdapter = AdapterBase & {
	runtime?: "mutation";
	send: (
		ctx: MutationCtx,
		delivery: Doc<"outreach_deliveries">,
		outreach: Doc<"outreach">
	) => Promise<DeliveryReceipt>;
};

export type ActionAdapter<Prepared extends Value = Value> = AdapterBase & {
	runtime: "action";
	prepare: (
		ctx: MutationCtx,
		delivery: Doc<"outreach_deliveries">,
		outreach: Doc<"outreach">
	) => Promise<Prepared>;
	send: (ctx: ActionCtx, prepared: Prepared) => Promise<DeliveryReceipt>;
};

export type ChannelAdapter = MutationAdapter | ActionAdapter;

/**
 * An action adapter for the registry. What `prepare` returns comes back to
 * `send` unchanged (through `claimForAction`), so the one narrowing is here.
 */
function actionAdapter<Prepared extends Value>(
	adapter: ActionAdapter<Prepared>
): ActionAdapter {
	return {
		...adapter,
		send: (ctx, prepared) => adapter.send(ctx, prepared as Prepared),
	};
}

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
	telegram: actionAdapter({ ...telegramAdapter, pool: outreachTelegramPool }),
};
