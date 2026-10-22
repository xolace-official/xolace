/**
 * Dev-only: seed a fresh profile with a fixed scenario that exercises every
 * rule of the steadiness engine (#515), dated relative to now. Repeatable:
 *
 *   bunx convex run users:getOrCreate '{"authProvider":"google"}' \
 *     --identity '{"subject":"seed-steadiness","issuer":"<CLERK_JWT_ISSUER_DOMAIN>"}'
 *   bunx convex run compounding/devSeed:seedScenario '{"profileId":"…"}'
 *   bunx convex run compounding/dev:steadiness '{"profileId":"…"}'
 *
 * Expected: work settled (burned, crisis and gave_up sessions counted, studies
 * + work once, a follow-up answered today), self unlocked at 75 (joy at
 * intensity 9, valence guard), family warming (abuse ignored, 2 days),
 * purpose warming (legacy "direction"), no reading from texture-only,
 * untagged or off-list sessions, overall = mean(work, self).
 */
import type { WorkflowId } from "@convex-dev/workflow";
import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { internalMutation } from "../_generated/server";
import { assertDevToolsEnabled } from "../devTools";

const DAY = 86_400_000;

type Seed = {
	daysAgo: number;
	intensity: number;
	tags: string[];
	emotion?: string;
	session?: Partial<Doc<"sessions">>;
	followUp?: { response: "processed"; answeredDaysAgo: number };
};

const SCENARIO: Seed[] = [
	{ daysAgo: 30, intensity: 4, tags: ["work"] },
	{
		daysAgo: 20,
		intensity: 5,
		session: { confirmationState: "gave_up" },
		tags: ["burnout", "conflict"],
	},
	{
		daysAgo: 10,
		intensity: 6,
		session: { kept: false },
		tags: ["studies", "work"],
	},
	{
		daysAgo: 3,
		followUp: { answeredDaysAgo: 0, response: "processed" },
		intensity: 8,
		session: { escalationTriggered: true, safeguardLevel: "crisis" },
		tags: ["work"],
	},
	{
		daysAgo: 1,
		intensity: 8,
		session: { postSessionMood: "heavier" },
		tags: ["work"],
	},
	{ daysAgo: 6, emotion: "joy", intensity: 9, tags: ["self-worth"] },
	{ daysAgo: 4, emotion: "pride", intensity: 9, tags: ["identity"] },
	{ daysAgo: 0, emotion: "joy", intensity: 9, tags: ["self-worth", "loss"] },
	{ daysAgo: 7, intensity: 7, tags: ["abuse", "family"] },
	{ daysAgo: 2, intensity: 5, tags: ["parenting"] },
	{ daysAgo: 3, intensity: 6, tags: ["direction"] },
	{ daysAgo: 0, intensity: 9, tags: ["loss", "change"] },
	{ daysAgo: 0, intensity: 9, tags: [] },
	{ daysAgo: 0, intensity: 9, tags: ["trust"] },
];

export const seedScenario = internalMutation({
	args: { profileId: v.id("emotional_profiles") },
	handler: async (ctx, { profileId }) => {
		assertDevToolsEnabled();
		const existing = await ctx.db
			.query("sessions")
			.withIndex("by_profile_time", (q) =>
				q.eq("emotionalProfileId", profileId)
			)
			.first();
		if (existing) {
			throw new Error("seedScenario needs a profile with no sessions");
		}

		const now = Date.now();
		for (const s of SCENARIO) {
			const at = now - s.daysAgo * DAY;
			const sessionId = await ctx.db.insert("sessions", {
				confirmationState: "confirmed",
				createdAt: at,
				emotionalProfileId: profileId,
				entryType: "open_prompt",
				kept: true,
				state: "completed",
				updatedAt: at,
				...s.session,
			});
			await ctx.db.insert("emotional_metadata", {
				classifierVersion: "seed-steadiness",
				createdAt: at,
				emotionalProfileId: profileId,
				intensity: s.intensity,
				primaryEmotion: s.emotion ?? "anxiety",
				primaryEmotionConfidence: 0.9,
				riskFlag: false,
				sessionId,
				specificity: 5,
				thematicTags: s.tags,
				userLanguageTags: [],
			});
			if (s.followUp) {
				await ctx.db.insert("follow_up_cards", {
					cardText: "How's it sitting now?",
					createdAt: at,
					emotionalProfileId: profileId,
					escalationDerived: false,
					resolvedAt: now - s.followUp.answeredDaysAgo * DAY,
					sessionId,
					status: "resolved",
					tier: "standard",
					userResponse: s.followUp.response,
					workflowId: "seed-steadiness" as WorkflowId,
				});
			}
		}
		return SCENARIO.length;
	},
	returns: v.number(),
});
