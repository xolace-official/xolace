import { vOnCompleteArgs } from "@convex-dev/workpool";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import { ADAPTERS, ChannelError } from "./adapters";
import {
	accountDeleted,
	escalationOrDormancy,
	loadNotifications,
	pickChannel,
} from "./router";
import type { ChannelErrorKind, OutreachChannel } from "./validators";

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
	const timing =
		when.runAt === undefined
			? { runAfter: when.runAfter ?? 0 }
			: { runAt: when.runAt };
	const workId = await adapter.pool.enqueueMutation(
		ctx,
		internal.outreach.deliver.deliver,
		{ deliveryId },
		{
			context: { deliveryId },
			onComplete: internal.outreach.deliver.onDeliveryComplete,
			...timing,
		}
	);
	await ctx.db.patch("outreach_deliveries", deliveryId, { workId });
}

/** Run one delivery through its channel's adapter. */
export const deliver = internalMutation({
	args: { deliveryId: v.id("outreach_deliveries") },
	handler: async (ctx, { deliveryId }) => {
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

		try {
			const receipt = await adapter.send(
				ctx,
				{ ...delivery, attempts, status: "sending" },
				outreach
			);
			const now = Date.now();
			await ctx.db.patch("outreach_deliveries", deliveryId, {
				...receipt,
				error: undefined,
				finishedAt: now,
				sentAt: now,
				status: "sent",
			});
		} catch (error) {
			// Anything else is a bug: let the mutation roll back, and
			// `onDeliveryComplete` records the failure.
			if (!(error instanceof ChannelError)) {
				throw error;
			}
			const recorded = {
				kind: error.kind,
				...(error.code !== undefined && { code: error.code }),
			};
			if (error.kind === "retry" && attempts < MAX_ATTEMPTS) {
				await ctx.db.patch("outreach_deliveries", deliveryId, {
					error: recorded,
					status: "queued",
				});
				await schedule(ctx, delivery.channel, deliveryId, {
					runAfter: error.afterMs ?? DEFAULT_RETRY_MS,
				});
				return null;
			}
			await finish(
				ctx,
				deliveryId,
				error.kind === "unreachable" ? "unreachable" : "failed",
				recorded
			);
		}
		return null;
	},
	returns: v.null(),
});

/** The workpool's verdict, for what `deliver` couldn't record itself. */
export const onDeliveryComplete = internalMutation({
	args: vOnCompleteArgs(v.object({ deliveryId: v.id("outreach_deliveries") })),
	handler: async (ctx, { context, result }) => {
		const delivery = await ctx.db.get(
			"outreach_deliveries",
			context.deliveryId
		);
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
