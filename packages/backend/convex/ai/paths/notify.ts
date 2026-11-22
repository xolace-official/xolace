import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalMutation } from "../../_generated/server";
import { posthog } from "../../posthog";

/**
 * kindling_ready notification (docs/paths-v1.md §10; #335). Called only after
 * `generateDb.write` has landed the kindling — there is no "being generated"
 * notification. Single voice, no variant selection.
 *
 * The outreach layer decides whether it goes out (#764): 30-day dormancy and
 * an open escalation suppress it, recorded on the outreach. It has its own
 * `kindlingReady` rate bucket (see `lib/rateLimits.ts`) rather than the shared
 * `notification` one, so an unrelated gentle_return / pattern_nudge /
 * milestone push earlier in the day can never silently swallow it.
 */

const CONTENT = "Your kindling is ready — a few small things picked for you.";

export const notifyReady = internalMutation({
	args: {
		emotionalProfileId: v.id("emotional_profiles"),
		pathId: v.id("paths"),
	},
	handler: async (ctx, args) => {
		const { outcome } = await ctx.runMutation(
			internal.outreach.enqueue.enqueue,
			{
				content: { body: CONTENT },
				dedupeKey: `kindling_ready:${args.pathId}`,
				emotionalProfileId: args.emotionalProfileId,
				intent: "kindling_ready",
				provenance: { triggerReason: "kindling_generated" },
			}
		);
		if (outcome !== "queued") {
			return null;
		}

		await posthog.capture(ctx, {
			distinctId: args.emotionalProfileId,
			event: "path_notified",
			properties: { pathId: args.pathId },
		});
		return null;
	},
	returns: v.null(),
});
