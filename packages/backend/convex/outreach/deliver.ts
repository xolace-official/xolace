import { vOnCompleteArgs } from "@convex-dev/workpool";
import { type Infer, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import {
	internalAction,
	internalMutation,
	type MutationCtx,
} from "../_generated/server";
import { ADAPTERS, type ChannelAdapter, ChannelError } from "./adapters";
import {
	accountDeleted,
	escalationOrDormancy,
	loadNotifications,
	pickChannel,
} from "./router";
import {
	type ChannelErrorKind,
	channelErrorKindValidator,
	type OutreachChannel,
	outreachChannelValidator,
} from "./validators";

/**
 * Delivery (#760): one `outreach_deliveries` row per attempt on a channel,
 * run on that channel's workpool. A failed or unreachable delivery gets one
 * fallback to the next eligible channel, at most once per outreach. No answer
 * is not a failure.
 */

/** An outreach has one delivery, plus at most one fallback. */
const MAX_DELIVERIES_PER_OUTREACH = 10;

/** Tries per delivery for `retry` errors before it counts as failed. */
const MAX_ATTEMPTS = 5;
const DEFAULT_RETRY_MS = 30_000;

/** Write a delivery and put it on its channel's workpool. */
export async function startDelivery(
	ctx: MutationCtx,
	args: {
		channel: OutreachChannel;
		isFallback: boolean;
		outreachId: Id<"outreach">;
		runAt?: number;
	}
): Promise<Id<"outreach_deliveries">> {
	const deliveryId = await ctx.db.insert("outreach_deliveries", {
		attempts: 0,
		channel: args.channel,
		createdAt: Date.now(),
		isFallback: args.isFallback,
		outreachId: args.outreachId,
		status: "queued",
	});
	await schedule(ctx, args.channel, deliveryId, { runAt: args.runAt });
	return deliveryId;
}

async function schedule(
	ctx: MutationCtx,
	channel: OutreachChannel,
	deliveryId: Id<"outreach_deliveries">,
	when: { runAt?: number; runAfter?: number }
) {
	const adapter = ADAPTERS[channel];
	if (!adapter) {
		await finish(ctx, deliveryId, "failed", { kind: "permanent" });
		return;
	}
	const options = {
		context: { deliveryId },
		onComplete: internal.outreach.deliver.onDeliveryComplete,
		...(when.runAt === undefined
			? { runAfter: when.runAfter ?? 0 }
			: { runAt: when.runAt }),
	};
	const workId =
		adapter.runtime === "action"
			? await adapter.pool.enqueueAction(
					ctx,
					internal.outreach.deliver.deliverAction,
					{ deliveryId },
					options
				)
			: await adapter.pool.enqueueMutation(
					ctx,
					internal.outreach.deliver.deliver,
					{ deliveryId },
					options
				);
	await ctx.db.patch("outreach_deliveries", deliveryId, { workId });
}

const receiptValidator = v.object({
	notificationLogId: v.optional(v.id("notification_log")),
	providerChatId: v.optional(v.string()),
	providerMessageId: v.optional(v.string()),
});

const attemptErrorValidator = v.object({
	afterMs: v.optional(v.number()),
	code: v.optional(v.string()),
	kind: channelErrorKindValidator,
});

/** How one try went: a receipt, or the `ChannelError` it threw. */
const attemptValidator = v.union(
	v.object({ ok: v.literal(true), receipt: receiptValidator }),
	v.object({ error: attemptErrorValidator, ok: v.literal(false) })
);
type Attempt = Infer<typeof attemptValidator>;

function failedAttempt(error: ChannelError): Attempt {
	return {
		error: {
			kind: error.kind,
			...(error.afterMs !== undefined && { afterMs: error.afterMs }),
			...(error.code !== undefined && { code: error.code }),
		},
		ok: false,
	};
}

/**
 * Take a queued delivery for a try: the deferred gates run again and the
 * attempt is counted. Null when there's nothing to send.
 */
async function claim(
	ctx: MutationCtx,
	deliveryId: Id<"outreach_deliveries">
): Promise<{
	adapter: ChannelAdapter;
	delivery: Doc<"outreach_deliveries">;
	outreach: Doc<"outreach">;
} | null> {
	const delivery = await ctx.db.get("outreach_deliveries", deliveryId);
	if (delivery?.status !== "queued") {
		return null;
	}
	const outreach = await ctx.db.get("outreach", delivery.outreachId);
	const adapter = ADAPTERS[delivery.channel];
	if (!(outreach && adapter)) {
		await finish(ctx, deliveryId, "failed", { kind: "permanent" });
		return null;
	}

	// A quiet-window deferral can sit for hours. A deletion request or a
	// crisis in that time still stops it: gates 2 and 3 run again here.
	if (outreach.sendAt !== undefined && delivery.attempts === 0) {
		const profile = await ctx.db.get(
			"emotional_profiles",
			outreach.emotionalProfileId
		);
		const held =
			!profile || (await accountDeleted(ctx, outreach.emotionalProfileId))
				? "account_deleted"
				: await escalationOrDormancy(ctx, outreach, profile, Date.now());
		if (held) {
			await ctx.db.patch("outreach_deliveries", deliveryId, {
				finishedAt: Date.now(),
				status: "canceled",
			});
			await ctx.db.patch("outreach", outreach._id, {
				outcome: "suppressed",
				suppressedReason: held,
			});
			return null;
		}
	}

	const attempts = delivery.attempts + 1;
	await ctx.db.patch("outreach_deliveries", deliveryId, {
		attempts,
		status: "sending",
	});
	return {
		adapter,
		delivery: { ...delivery, attempts, status: "sending" },
		outreach,
	};
}

/** Record a try: sent, retried on the channel's pool, or failed for good. */
async function settle(
	ctx: MutationCtx,
	delivery: Doc<"outreach_deliveries">,
	attempt: Attempt
): Promise<void> {
	if (attempt.ok) {
		const now = Date.now();
		await ctx.db.patch("outreach_deliveries", delivery._id, {
			...attempt.receipt,
			error: undefined,
			finishedAt: now,
			sentAt: now,
			status: "sent",
		});
		await ADAPTERS[delivery.channel]?.afterSent?.(ctx, delivery._id);
		return;
	}
	const { afterMs, ...recorded } = attempt.error;
	if (recorded.kind === "retry" && delivery.attempts < MAX_ATTEMPTS) {
		await ctx.db.patch("outreach_deliveries", delivery._id, {
			error: recorded,
			status: "queued",
		});
		await schedule(ctx, delivery.channel, delivery._id, {
			runAfter: afterMs ?? DEFAULT_RETRY_MS,
		});
		return;
	}
	await finish(
		ctx,
		delivery._id,
		recorded.kind === "unreachable" ? "unreachable" : "failed",
		recorded
	);
}

/** Run one delivery through its channel's adapter, in one transaction. */
export const deliver = internalMutation({
	args: { deliveryId: v.id("outreach_deliveries") },
	handler: async (ctx, { deliveryId }) => {
		const claimed = await claim(ctx, deliveryId);
		if (!claimed) {
			return null;
		}
		const { adapter, delivery, outreach } = claimed;
		if (adapter.runtime === "action") {
			// Scheduled before its adapter changed runtime: send it the other way.
			await ctx.db.patch("outreach_deliveries", deliveryId, {
				status: "queued",
			});
			await schedule(ctx, delivery.channel, deliveryId, {});
			return null;
		}
		let attempt: Attempt;
		try {
			attempt = {
				ok: true,
				receipt: await adapter.send(ctx, delivery, outreach),
			};
		} catch (error) {
			// Anything else is a bug: let the mutation roll back, and
			// `onDeliveryComplete` records the failure.
			if (!(error instanceof ChannelError)) {
				throw error;
			}
			attempt = failedAttempt(error);
		}
		await settle(ctx, delivery, attempt);
		return null;
	},
	returns: v.null(),
});

/**
 * An action adapter's first half: claim the delivery and decide what to send.
 * Null when nothing is to be sent (including a `prepare` that refused, which
 * is recorded here).
 */
export const claimForAction = internalMutation({
	args: { deliveryId: v.id("outreach_deliveries") },
	handler: async (ctx, { deliveryId }) => {
		const claimed = await claim(ctx, deliveryId);
		if (!claimed) {
			return null;
		}
		const { adapter, delivery, outreach } = claimed;
		if (adapter.runtime !== "action") {
			await finish(ctx, deliveryId, "failed", { kind: "permanent" });
			return null;
		}
		try {
			return {
				channel: delivery.channel,
				prepared: await adapter.prepare(ctx, delivery, outreach),
			};
		} catch (error) {
			if (!(error instanceof ChannelError)) {
				throw error;
			}
			await settle(ctx, delivery, failedAttempt(error));
			return null;
		}
	},
	// What `prepare` returns is the adapter's own shape.
	returns: v.union(
		v.null(),
		v.object({ channel: outreachChannelValidator, prepared: v.any() })
	),
});

export const settleAttempt = internalMutation({
	args: { attempt: attemptValidator, deliveryId: v.id("outreach_deliveries") },
	handler: async (ctx, { attempt, deliveryId }) => {
		const delivery = await ctx.db.get("outreach_deliveries", deliveryId);
		if (delivery?.status === "sending") {
			await settle(ctx, delivery, attempt);
		}
		return null;
	},
	returns: v.null(),
});

/** Run one delivery through an action adapter: claim, send, record. */
export const deliverAction = internalAction({
	args: { deliveryId: v.id("outreach_deliveries") },
	handler: async (ctx, { deliveryId }) => {
		const claimed = await ctx.runMutation(
			internal.outreach.deliver.claimForAction,
			{ deliveryId }
		);
		if (claimed === null) {
			return null;
		}
		const adapter = ADAPTERS[claimed.channel];
		if (adapter?.runtime !== "action") {
			throw new Error("No action adapter for a claimed delivery.");
		}
		let attempt: Attempt;
		try {
			attempt = {
				ok: true,
				receipt: await adapter.send(ctx, claimed.prepared),
			};
		} catch (error) {
			// Anything else is a bug: `onDeliveryComplete` records the failure.
			if (!(error instanceof ChannelError)) {
				throw error;
			}
			attempt = failedAttempt(error);
		}
		await ctx.runMutation(internal.outreach.deliver.settleAttempt, {
			attempt,
			deliveryId,
		});
		return null;
	},
	returns: v.null(),
});

/** The workpool's verdict, for what the runner couldn't record itself. */
export const onDeliveryComplete = internalMutation({
	args: vOnCompleteArgs(v.object({ deliveryId: v.id("outreach_deliveries") })),
	handler: async (ctx, { context, result }) => {
		const delivery = await ctx.db.get(
			"outreach_deliveries",
			context.deliveryId
		);
		// A mutation that threw rolled back to `queued`. An action that threw
		// after its claim left `sending`, and may already have sent: it fails
		// without the fallback, so nobody gets the same outreach twice.
		if (delivery?.status === "sending" && result.kind === "failed") {
			await ctx.db.patch("outreach_deliveries", delivery._id, {
				error: { kind: "permanent" },
				finishedAt: Date.now(),
				status: "failed",
			});
			return null;
		}
		if (delivery?.status !== "queued") {
			return null;
		}
		if (result.kind === "failed") {
			await finish(ctx, delivery._id, "failed", { kind: "permanent" });
		} else if (result.kind === "canceled") {
			await ctx.db.patch("outreach_deliveries", delivery._id, {
				finishedAt: Date.now(),
				status: "canceled",
			});
		}
		return null;
	},
	returns: v.null(),
});

async function finish(
	ctx: MutationCtx,
	deliveryId: Id<"outreach_deliveries">,
	status: "failed" | "unreachable",
	error: { kind: ChannelErrorKind; code?: string }
) {
	await ctx.db.patch("outreach_deliveries", deliveryId, {
		error,
		finishedAt: Date.now(),
		status,
	});
	const delivery = await ctx.db.get("outreach_deliveries", deliveryId);
	if (delivery) {
		await fallBackOnce(ctx, delivery);
	}
}

/** The one fallback per outreach: the next eligible channel, sent now. */
async function fallBackOnce(
	ctx: MutationCtx,
	failed: Doc<"outreach_deliveries">
) {
	const deliveries = await ctx.db
		.query("outreach_deliveries")
		.withIndex("by_outreach", (q) => q.eq("outreachId", failed.outreachId))
		.take(MAX_DELIVERIES_PER_OUTREACH);
	if (deliveries.some((d) => d.isFallback)) {
		return;
	}
	const outreach = await ctx.db.get("outreach", failed.outreachId);
	const profile =
		outreach &&
		(await ctx.db.get("emotional_profiles", outreach.emotionalProfileId));
	if (!(outreach && profile)) {
		return;
	}
	const channel = await pickChannel(
		ctx,
		outreach,
		profile,
		await loadNotifications(ctx, outreach.emotionalProfileId),
		deliveries.map((d) => d.channel)
	);
	if (channel) {
		await startDelivery(ctx, {
			channel,
			isFallback: true,
			outreachId: outreach._id,
		});
	}
}
