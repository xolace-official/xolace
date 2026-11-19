/**
 * Re-checking an unchecked letter in the background (spec §5.4), at 5 min,
 * 30 min and 2 h after it was stored, then at each sweep. The same check as
 * at send; an unchecked letter is never placed.
 *
 * Late outcomes: pass → waiting (and it tries the pool); risk → the
 * escalation, the letter is deleted, and the sender's next open shows care;
 * held → held (review, strike), and its Sent row says it can't be sent;
 * fixable or not English → returned (decision C). The sender was told the
 * letter was on its way, so a late risk or hold is shown, not left silent
 * (owner, 19 Nov 2026).
 */
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
	internalAction,
	internalMutation,
	internalQuery,
	type MutationCtx,
} from "../_generated/server";
import { letterCheckDeps } from "../ai/letters/run";
import { captureLetterEvent } from "./analytics";
import { checkLetterText } from "./decide";
import { letterProfileOf } from "./profiles";
import { RECHECK_DELAYS_MS, textHashOf } from "./rules";
import { holdForReview, raiseLetterRisk, riskArgs } from "./send";

const recheckOutcomeValidator = v.union(
	v.object({ kind: v.literal("pass") }),
	v.object({ kind: v.literal("unavailable") }),
	v.object({ kind: v.literal("returned") }),
	v.object({ kind: v.literal("held"), textHash: v.string() }),
	v.object({
		kind: v.literal("risk"),
		level: riskArgs.level,
		peak: riskArgs.peak,
	})
);

/** The words of a letter still waiting on its check, or null. */
export const unchecked = internalQuery({
	args: { letterId: v.id("letters") },
	handler: async (ctx, args) => {
		const letter = await ctx.db.get("letters", args.letterId);
		return letter?.status === "unchecked" ? { text: letter.text } : null;
	},
	returns: v.union(v.null(), v.object({ text: v.string() })),
});

export const recheck = internalAction({
	args: { letterId: v.id("letters") },
	handler: async (ctx, args) => {
		const letter = await ctx.runQuery(internal.letters.check.unchecked, args);
		if (!letter) {
			return null;
		}
		const check = await checkLetterText(letter.text, letterCheckDeps);
		let outcome: typeof recheckOutcomeValidator.type;
		switch (check.kind) {
			case "risk":
				outcome = {
					kind: "risk",
					level: check.level,
					...(check.peak && { peak: check.peak }),
				};
				break;
			case "held":
				outcome = { kind: "held", textHash: await textHashOf(letter.text) };
				break;
			case "lang":
			case "fixable":
				outcome = { kind: "returned" };
				break;
			case "unavailable":
				outcome = { kind: "unavailable" };
				break;
			default:
				outcome = { kind: "pass" };
		}
		await ctx.runMutation(internal.letters.check.apply, {
			letterId: args.letterId,
			outcome,
		});
		return null;
	},
	returns: v.null(),
});

/** Care at the sender's next open; a crisis is never lowered by a later risk. */
async function flagLateRisk(
	ctx: MutationCtx,
	sender: Id<"emotional_profiles">,
	level: "elevated" | "crisis"
): Promise<void> {
	const row = await letterProfileOf(ctx, sender);
	if (row && row.lateRisk !== "crisis") {
		await ctx.db.patch("letter_profiles", row._id, { lateRisk: level });
	}
}

export const apply = internalMutation({
	args: { letterId: v.id("letters"), outcome: recheckOutcomeValidator },
	handler: async (ctx, { letterId, outcome }) => {
		const letter = await ctx.db.get("letters", letterId);
		// Withdrawn or already decided while the check ran.
		if (letter?.status !== "unchecked") {
			return null;
		}
		const now = Date.now();
		const recheckCount = (letter.recheckCount ?? 0) + 1;
		const sender = letter.senderProfileId;
		switch (outcome.kind) {
			case "pass":
				await ctx.db.patch("letters", letterId, {
					checkedAt: now,
					recheckCount,
					status: "waiting",
				});
				await ctx.scheduler.runAfter(0, internal.letters.match.place, {
					letterId,
				});
				break;
			case "risk":
				if (sender) {
					await raiseLetterRisk(ctx, {
						level: outcome.level,
						profileId: sender,
						...(outcome.peak && { peak: outcome.peak }),
					});
					await flagLateRisk(ctx, sender, outcome.level);
				}
				// At-risk words are never stored (#750).
				await ctx.db.delete("letters", letterId);
				break;
			case "held":
				await ctx.db.patch("letters", letterId, {
					heldLate: true,
					recheckCount,
					status: "held",
					textHash: outcome.textHash,
				});
				if (sender) {
					await holdForReview(ctx, letterId, sender, now);
				}
				break;
			case "returned":
				await ctx.db.patch("letters", letterId, {
					recheckCount,
					status: "returned",
				});
				if (sender) {
					await captureLetterEvent(ctx, sender, {
						event: "letter_returned",
						properties: { why: "recheck" },
					});
				}
				break;
			default: {
				const next = RECHECK_DELAYS_MS[recheckCount];
				// Past the last delay, each sweep tries again: due now.
				await ctx.db.patch("letters", letterId, {
					recheckCount,
					recheckDueAt: now + (next ?? 0),
				});
				if (next !== undefined) {
					await ctx.scheduler.runAfter(next, internal.letters.check.recheck, {
						letterId,
					});
				}
			}
		}
		return null;
	},
	returns: v.null(),
});
