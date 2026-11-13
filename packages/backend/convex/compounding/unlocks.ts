/**
 * Unlock moments (#523; #490 §5, #513): the session whose reading moves a
 * domain out of warming gets a quiet session-end beat — a bigger one for the
 * first unlock. If the beat goes unseen, one generic push the next day in the
 * person's usual hour, at most one a week, through the usual preferences.
 * Every user, free too (signal unlocks, payment gates viewing). Settling
 * never pushes.
 */
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import {
	internalMutation,
	type MutationCtx,
	mutation,
} from "../_generated/server";
import { awardLadderRungs } from "../achievements/ladders";
import { requireSessionOwnership } from "../lib/auth";
import { missedPushAt } from "../lib/missedBeat";
import { loadReadings } from "./readings";
import { computeSteadiness } from "./steadiness";

/**
 * Stamp the domains this session unlocked and schedule the missed-beat push.
 * Replays state just before the session against state at it, so only the
 * session that brought a domain's third distinct day counts — whenever it's
 * evaluated. A domain already recorded unlocked stays so (#535), so it never
 * counts twice. Idempotent.
 */
export async function recordUnlock(
	ctx: MutationCtx,
	session: Doc<"sessions">,
	{ readings, timezone, unlocked }: Awaited<ReturnType<typeof loadReadings>>
): Promise<void> {
	const stateAt = (now: number) =>
		new Map(
			computeSteadiness(readings, { now, timezone, unlocked }).domains.map(
				(d) => [d.domain, d.state]
			)
		);
	const before = stateAt(session.createdAt - 1);
	const at = [...stateAt(session.createdAt)].filter(
		([, state]) => state !== "warming"
	);

	// Every open domain gets a stamp, not only this session's: one unlocked
	// before stamps existed is recorded the next time anyone comes back.
	const fresh = at
		.filter(([domain]) => !unlocked.some((u) => u.domain === domain))
		.map(([domain]) => ({ at: session.createdAt, domain }));
	if (fresh.length) {
		await ctx.db.patch("emotional_profiles", session.emotionalProfileId, {
			unlockedDomains: [...unlocked, ...fresh],
		});
		// dropColdUnlocks takes a stamp, never the badge (#695).
		await awardLadderRungs(
			ctx,
			session.emotionalProfileId,
			"areas_unlocked",
			unlocked.length + fresh.length,
			Date.now()
		);
	}

	if (session.domainUnlock) {
		return;
	}
	const domains = at
		.filter(([domain]) => (before.get(domain) ?? "warming") === "warming")
		.map(([domain]) => domain);
	if (domains.length === 0) {
		return;
	}

	const first = ![...before.values()].some((state) => state !== "warming");
	await ctx.db.patch("sessions", session._id, {
		domainUnlock: { domains, first },
	});
	const profile = await ctx.db.get(
		"emotional_profiles",
		session.emotionalProfileId
	);
	await ctx.scheduler.runAt(
		missedPushAt(Date.now(), profile?.typicalUsagePattern?.hourOfDay),
		internal.compounding.unlocks.sendMissedPush,
		{ sessionId: session._id }
	);
}

/**
 * Retention just purged sessions: a domain left no readings goes cold, so its
 * stamp goes and a return unlocks it afresh (CONTEXT.md). Its own transaction,
 * one per profile, so a page of retention stays within read limits.
 */
export const dropColdUnlocks = internalMutation({
	args: { profileId: v.id("emotional_profiles") },
	handler: async (ctx, { profileId }) => {
		const profile = await ctx.db.get("emotional_profiles", profileId);
		if (!profile?.unlockedDomains?.length) {
			return null;
		}
		const { readings, unlocked, truncated } = await loadReadings(
			ctx,
			profileId
		);
		// ponytail: past the read window a domain may still have older readings;
		// keep every stamp rather than replay an unlock. Exact once readings roll up.
		if (truncated) {
			return null;
		}
		const kept = unlocked.filter((u) =>
			readings.some((r) => r.domain === u.domain)
		);
		if (kept.length < unlocked.length) {
			await ctx.db.patch("emotional_profiles", profileId, {
				unlockedDomains: kept,
			});
		}
		return null;
	},
	returns: v.null(),
});

/** The beat showed at session end: the push stands down. */
export const markSeen = mutation({
	args: { sessionId: v.id("sessions") },
	handler: async (ctx, { sessionId }) => {
		const { session } = await requireSessionOwnership(ctx, sessionId);
		if (session.domainUnlock && session.domainUnlock.seenAt === undefined) {
			await ctx.db.patch("sessions", sessionId, {
				domainUnlock: { ...session.domainUnlock, seenAt: Date.now() },
			});
		}
		return null;
	},
	returns: v.null(),
});

/**
 * The beat went unseen. Generic text: the lock screen isn't private, so the
 * domain never leaves the app. Milestone family; the outreach layer applies
 * the toggle, the quiet window (deferred to its end) and the weekly
 * `domainUnlock` bucket (#764).
 */
export const sendMissedPush = internalMutation({
	args: {
		/**
		 * @deprecated The caller-side quiet-window retry count; the outreach
		 * layer defers through the window now (#764). Ignored.
		 */
		// DEPRECATED(remove-after: backend deploys after #764 have drained every
		// re-check scheduled before it): no replacement, nothing reads it.
		quietRetries: v.optional(v.number()),
		sessionId: v.id("sessions"),
	},
	handler: async (ctx, { sessionId }) => {
		const session = await ctx.db.get("sessions", sessionId);
		if (!session?.domainUnlock || session.domainUnlock.seenAt !== undefined) {
			return null;
		}

		await ctx.runMutation(internal.outreach.enqueue.enqueue, {
			content: {
				body: "Part of your Insights has come into focus.",
				title: "Something new is ready.",
			},
			dedupeKey: `domain_unlock:${sessionId}`,
			emotionalProfileId: session.emotionalProfileId,
			intent: "domain_unlock",
			provenance: { triggerReason: "domain_unlock_missed" },
		});
		return null;
	},
	returns: v.null(),
});
