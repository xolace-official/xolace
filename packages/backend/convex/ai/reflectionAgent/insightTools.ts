import type Anthropic from "@anthropic-ai/sdk";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import { when } from "../../compounding/insightEvidence";
import { type FactSession, rawMaterial } from "../../compounding/insightFacts";
import {
	DIRECTIONS,
	INSIGHT_KINDS,
	type InsightDraft,
	type InsightKind,
} from "../../compounding/insightGate";
import { DOMAINS } from "../../lib/understandingVocab";
import { rag } from "../../rag";

// =============================================================
// Reflection Agent — STEADINESS INSIGHT TOOLS (#525, #526, ADR 0019).
//
// get_domain_steadiness hands the agent the counted facts, the citable
// sessions and the raw material code found (RAG thread candidates and relief
// recurrence, say vs after, crowding out, absence); write_insight goes
// through compounding/insightStore.save, which rebuilds the evidence itself
// and runs the quality gate before storing.
// =============================================================

/** Xolace+ with personal memory on only: the steadiness-insight pair (#525). */
export const INSIGHT_TOOLS: Anthropic.Tool[] = [
	{
		description:
			"Counted facts per part of their life, every session you may cite (id, when in their week, their own words, what they chose, how it ended, their later check-in), and the raw material code found across them: threadCandidates, reliefSources, sayVsAfter, crowdingOut, absences. Read this before write_insight.",
		input_schema: { properties: {}, type: "object" },
		name: "get_domain_steadiness",
	},
	{
		description:
			"Save one steadiness insight. Checked by code before it's kept; a rejection tells you why, so you can fix it or drop it. At most 4 per run, at most 2 of them overall (thread, crowding).",
		input_schema: {
			properties: {
				citedSessionIds: {
					description:
						"Ids of the sessions this rests on, spread across at least two weeks (3 or more for thread, crowding and absence).",
					items: { type: "string" },
					type: "array",
				},
				direction: {
					description:
						"Only what the text claims about the first domain NOW against its usual: lower or higher. Otherwise none.",
					enum: [...DIRECTIONS],
					type: "string",
				},
				domains: {
					description:
						"thread and crowding: every domain it spans (two or more), the one the claim is about first. say_vs_after, relief, absence: the one domain whose card it belongs in.",
					items: { enum: [...DOMAINS], type: "string" },
					type: "array",
				},
				kind: { enum: [...INSIGHT_KINDS], type: "string" },
				text: {
					description:
						"To the person, as 'you'. Two or three plain sentences, under 320 characters.",
					type: "string",
				},
			},
			required: ["kind", "domains", "text", "citedSessionIds", "direction"],
			type: "object",
		},
		name: "write_insight",
	},
];

// Spelled out: FunctionReturnType of the query here makes `internal` circular.
type Evidence = {
	today: string;
	timezone: string;
	domains: unknown[];
	sessions: unknown[];
	raw: FactSession[];
};

/** What get_domain_steadiness returns: the evidence plus its raw material, minus the search text. */
export async function steadinessView(
	{ raw, timezone, ...view }: Evidence,
	{ now, search }: { now: number; search: (text: string) => Promise<string[]> }
) {
	return {
		...view,
		...(await rawMaterial(raw, {
			now,
			search,
			when: (at) => when(at, timezone),
		})),
	};
}

/** The insight tools' dispatch; null for any other name. */
export async function dispatchInsightTool(
	ctx: ActionCtx,
	emotionalProfileId: Id<"emotional_profiles">,
	name: string,
	input: Record<string, unknown>,
	runAt: number
): Promise<string | null> {
	switch (name) {
		case "get_domain_steadiness": {
			const evidence: Evidence = await ctx.runQuery(
				internal.compounding.insightEvidence.domainSteadiness,
				{
					emotionalProfileId,
				}
			);
			// Neighbours in their own namespace only; a failed search just finds nothing.
			const search = async (query: string) => {
				const { entries } = await rag.search(ctx, {
					limit: 8,
					namespace: emotionalProfileId,
					query,
				});
				return entries.flatMap((e) => (e.key ? [e.key] : []));
			};
			return JSON.stringify(
				await steadinessView(evidence, { now: Date.now(), search })
			);
		}

		case "write_insight": {
			const draft = input as Partial<InsightDraft>;
			if (
				!(
					INSIGHT_KINDS.includes(draft.kind as InsightKind) &&
					Array.isArray(draft.domains) &&
					draft.domains.every((d) => (DOMAINS as readonly string[]).includes(d))
				) ||
				typeof draft.text !== "string" ||
				!Array.isArray(draft.citedSessionIds) ||
				!DIRECTIONS.includes(draft.direction as InsightDraft["direction"])
			) {
				return "Rejected, not saved: malformed input; follow the schema.";
			}
			return await ctx.runMutation(internal.compounding.insightStore.save, {
				citedSessionIds: draft.citedSessionIds.map(String),
				direction: draft.direction as InsightDraft["direction"],
				domains: draft.domains,
				emotionalProfileId,
				kind: draft.kind as InsightKind,
				runAt,
				text: draft.text,
			});
		}

		default:
			return null;
	}
}
