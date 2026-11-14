import { type Infer, v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalMutation } from "../_generated/server";
import { captureRouted } from "./analytics";
import { startDelivery } from "./deliver";
import { quietWindowEndsAt } from "./quietWindow";
import {
	consumeTypeBucket,
	isAcuteNudge,
	personGates,
	pickChannel,
} from "./router";
import {
	followUpTierValidator,
	outreachContentValidator,
	outreachIntentValidator,
	outreachOutcomeValidator,
	outreachProvenanceValidator,
	outreachVariantsValidator,
	type SuppressedReason,
	suppressedReasonValidator,
} from "./validators";

const enqueueArgs = {
	content: outreachContentValidator,
	/** A repeat call with the same key returns the existing row, e.g. `nudge:<cardId>:<n>`. */
	dedupeKey: v.optional(v.string()),
	emotionalProfileId: v.id("emotional_profiles"),
	followUpId: v.optional(v.id("follow_up_cards")),
	intent: outreachIntentValidator,
	provenance: outreachProvenanceValidator,
	tier: v.optional(followUpTierValidator),
	variants: v.optional(outreachVariantsValidator),
};

const enqueueResult = v.object({
	outcome: outreachOutcomeValidator,
	outreachId: v.id("outreach"),
	suppressedReason: v.optional(suppressedReasonValidator),
});
type EnqueueResult = Infer<typeof enqueueResult>;

/**
 * The outreach layer's one way in (#760). Callers say *when* and *what*; this
 * decides *whether* and *where*, in one transaction, gates in order:
 *
 * 1. dedupe on `dedupeKey`; 2. account deleted; 3. escalation and dormancy;
 * 4. the per-intent toggle; 5. the per-type rate bucket; 6. the quiet window
 * (`sendAt` = its end; an acute nudge ignores it); 7. the first eligible
 * channel in the person's order; 8. none → `no_channel`; 9. write the outreach
 * and its delivery, queued on that channel's workpool.
 *
 * Every outcome is recorded on `outreach`, suppressions included.
 */
export const enqueue = internalMutation({
	args: enqueueArgs,
	handler: async (ctx, args): Promise<EnqueueResult> => {
		const now = Date.now();

		if (args.dedupeKey !== undefined) {
			const existing = await ctx.db
				.query("outreach")
				.withIndex("by_dedupe", (q) => q.eq("dedupeKey", args.dedupeKey))
				.first();
			if (existing) {
				return {
					outcome: existing.outcome,
					outreachId: existing._id,
					...(existing.suppressedReason && {
						suppressedReason: existing.suppressedReason,
					}),
				};
			}
		}

		const record = async (
			outcome:
				| { kind: "suppressed"; reason: SuppressedReason }
				| { kind: "queued"; sendAt: number | null }
		): Promise<Id<"outreach">> =>
			await ctx.db.insert("outreach", {
				content: args.content,
				createdAt: now,
				emotionalProfileId: args.emotionalProfileId,
				intent: args.intent,
				provenance: args.provenance,
				...(args.dedupeKey !== undefined && { dedupeKey: args.dedupeKey }),
				...(args.followUpId && { followUpId: args.followUpId }),
				...(args.tier && { tier: args.tier }),
				...(args.variants && { variants: args.variants }),
				...(outcome.kind === "suppressed"
					? { outcome: "suppressed", suppressedReason: outcome.reason }
					: {
							outcome: "queued",
							...(outcome.sendAt !== null && { sendAt: outcome.sendAt }),
						}),
			});

		const suppress = async (
			reason: SuppressedReason
		): Promise<EnqueueResult> => {
			const outreachId = await record({ kind: "suppressed", reason });
			await captureRouted(ctx, args, { kind: "suppressed", reason });
			return { outcome: "suppressed", outreachId, suppressedReason: reason };
		};

		const gates = await personGates(ctx, args, now);
		if (gates.held) {
			return await suppress(gates.held);
		}
		const { notifications, profile } = gates;

		if (!(await consumeTypeBucket(ctx, args))) {
			return await suppress("rate_limit");
		}

		const sendAt = isAcuteNudge(args)
			? null
			: quietWindowEndsAt(notifications, now);

		const channel = await pickChannel(ctx, args, profile, notifications);
		if (!channel) {
			return await suppress("no_channel");
		}

		const outreachId = await record({ kind: "queued", sendAt });
		await startDelivery(ctx, {
			channel,
			isFallback: false,
			outreachId,
			...(sendAt !== null && { runAt: sendAt }),
		});
		await captureRouted(ctx, args, {
			channel,
			deferred: sendAt !== null,
			kind: "queued",
		});
		return { outcome: "queued", outreachId };
	},
	returns: enqueueResult,
});
