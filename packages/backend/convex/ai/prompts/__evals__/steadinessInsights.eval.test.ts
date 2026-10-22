/**
 * Steadiness insights, live (#525, #526). Runs the real consolidation prompt
 * and tool set over a fixture person, with get_domain_steadiness built by the
 * real raw-material code (a keyword stand-in for RAG) and every write_insight
 * going through the real quality gate, and prints what passed and what was
 * turned away.
 *
 * Run: `EVAL_OUT=insights.txt bun run test:evals convex/ai/prompts/__evals__/steadinessInsights`
 * (needs ANTHROPIC_API_KEY; skips cleanly without). EVAL_OUT keeps the output.
 *
 * The real bar is a person reading the output and agreeing it's a revelation
 * (#526): not their log read back, not one session reframed. The rich person
 * carries all five shapes: "behind" under work, sleep and money (thread);
 * friends gone since work got heavy (crowding); work sessions ending fine and
 * checking in heavier (say vs after); the lightest session being the sister's
 * wedding (relief); never a good or light work session (absence). The thin
 * person gets none. Filler is the failure, not silence.
 */
import { appendFileSync } from "node:fs";
import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { when } from "../../../compounding/insightEvidence";
import type { FactSession } from "../../../compounding/insightFacts";
import {
	type CitableSession,
	gateInsight,
	type InsightDraft,
	isOverall,
} from "../../../compounding/insightGate";
import type { Domain } from "../../../lib/understandingVocab";
import { DOMAIN_LABELS } from "../../../lib/understandingVocab";
import {
	getAnthropicClient,
	REFLECTION_CONSOLIDATION_MODEL,
	thinkingOff,
} from "../../providers/anthropic";
import {
	INSIGHT_TOOLS,
	steadinessView,
} from "../../reflectionAgent/insightTools";
import { REFLECTION_TOOLS, WRITE_TOOL } from "../../reflectionAgent/tools";
import { buildConsolidationSystemPrompt } from "../reflectionConsolidation";
import { hasApiKey } from "./harness.eval";

const TZ = "UTC";
const NOW = Date.UTC(2026, 9, 9, 12);
const DAY = 86_400_000;
const at = (daysAgo: number, hour: number) => {
	const d = new Date(NOW - daysAgo * DAY);
	return d.setUTCHours(hour, 0, 0, 0);
};

type FixtureSession = {
	id: string;
	at: number;
	domains: Domain[];
	emotion: string;
	intensity: number;
	theirWords: string[];
	good?: boolean;
	alsoAbout?: string[];
	chose?: string;
	moodAfter?: "lighter" | "same" | "heavier";
	checkIn?: { answer: string; whatHelped: string | null };
};
type Fixture = {
	sessions: FixtureSession[];
	domains: Record<
		string,
		{
			steadiness: number;
			usual: number;
			quietSince?: string;
			compounding?: object;
		}
	>;
};

const SOLO = "stayed with it a while (Sit with this)";
const EXIT = "just needed to say it, and left";
const heavier = { answer: "heavier", whatHelped: null };
const RICH: Fixture = {
	domains: {
		family: { steadiness: 84, usual: 78 },
		health: { steadiness: 52, usual: 60 },
		love: { quietSince: when(at(92, 21), TZ), steadiness: 70, usual: 70 },
		money: { steadiness: 55, usual: 62 },
		work: {
			compounding: {
				linkedOnsetOrder: [
					`work (${when(at(85, 9), TZ)})`,
					`health (${when(at(75, 2), TZ)})`,
				],
				since: when(at(85, 9), TZ),
				state: "compounding",
			},
			steadiness: 44,
			usual: 63,
		},
	},
	sessions: [
		// Friends, until work got heavy.
		{
			alsoAbout: ["friendships"],
			at: at(121, 19),
			domains: ["love"],
			emotion: "contentment",
			good: true,
			id: "l1",
			intensity: 3,
			moodAfter: "lighter",
			theirWords: ["Friday drinks with Ade and Tomi", "laughed till it hurt"],
		},
		{
			alsoAbout: ["friendships"],
			at: at(110, 20),
			domains: ["love"],
			emotion: "longing",
			id: "l2",
			intensity: 5,
			moodAfter: "same",
			theirWords: ["group chat's gone quiet", "miss the gang"],
		},
		{
			alsoAbout: ["friendships"],
			at: at(101, 18),
			domains: ["love"],
			emotion: "warmth",
			good: true,
			id: "l3",
			intensity: 3,
			moodAfter: "lighter",
			theirWords: ["Tomi's birthday", "felt like myself"],
		},
		{
			alsoAbout: ["friendships"],
			at: at(92, 21),
			domains: ["love"],
			emotion: "guilt",
			id: "l4",
			intensity: 5,
			moodAfter: "same",
			theirWords: ["cancelled on Ade again", "no energy for anyone"],
		},
		// Work gets heavy from mid-July; ends "fine", checks in heavier.
		{
			at: at(85, 9),
			checkIn: heavier,
			chose: SOLO,
			domains: ["work"],
			emotion: "overwhelm",
			id: "w1",
			intensity: 7,
			moodAfter: "same",
			theirWords: ["new manager", "behind before I've started"],
		},
		{
			at: at(78, 22),
			checkIn: heavier,
			chose: EXIT,
			domains: ["work"],
			emotion: "anxiety",
			id: "w2",
			intensity: 7,
			moodAfter: "same",
			theirWords: ["it's fine, just busy", "behind on the roadmap"],
		},
		{
			at: at(62, 9),
			checkIn: heavier,
			chose: SOLO,
			domains: ["work"],
			emotion: "frustration",
			id: "w3",
			intensity: 6,
			moodAfter: "lighter",
			theirWords: ["fine really", "everyone else keeps up"],
		},
		{
			at: at(47, 21),
			checkIn: heavier,
			chose: EXIT,
			domains: ["work"],
			emotion: "dread",
			id: "w4",
			intensity: 8,
			moodAfter: "same",
			theirWords: ["behind on everything", "Monday already"],
		},
		{
			at: at(40, 13),
			checkIn: { answer: "still_here", whatHelped: null },
			domains: ["work"],
			emotion: "tiredness",
			id: "w5",
			intensity: 6,
			moodAfter: "same",
			theirWords: ["it's fine", "just tired"],
		},
		{
			at: at(26, 22),
			checkIn: heavier,
			chose: EXIT,
			domains: ["work"],
			emotion: "overwhelm",
			id: "w6",
			intensity: 7,
			moodAfter: "same",
			theirWords: ["behind again", "fine, I'll sort it"],
		},
		{
			at: at(12, 9),
			checkIn: heavier,
			chose: SOLO,
			domains: ["work"],
			emotion: "anxiety",
			id: "w7",
			intensity: 6,
			moodAfter: "lighter",
			theirWords: ["fine", "catching up at weekends"],
		},
		{
			at: at(4, 21),
			domains: ["work"],
			emotion: "exhaustion",
			id: "w8",
			intensity: 7,
			moodAfter: "same",
			theirWords: ["behind", "can't see the end of it"],
		},
		// Sleep and money, both "behind".
		{
			at: at(75, 2),
			domains: ["health"],
			emotion: "restlessness",
			id: "h1",
			intensity: 7,
			theirWords: ["lying awake doing the maths of what I'm behind on"],
		},
		{
			at: at(50, 3),
			domains: ["health"],
			emotion: "exhaustion",
			id: "h2",
			intensity: 7,
			theirWords: ["behind on sleep", "4am again"],
		},
		{
			at: at(30, 1),
			domains: ["health", "work"],
			emotion: "restlessness",
			id: "h3",
			intensity: 6,
			theirWords: ["replaying the standup", "behind"],
		},
		{
			at: at(15, 2),
			domains: ["health"],
			emotion: "exhaustion",
			id: "h4",
			intensity: 7,
			theirWords: ["can't switch off", "behind on rest"],
		},
		{
			at: at(68, 20),
			domains: ["money"],
			emotion: "worry",
			id: "m1",
			intensity: 6,
			theirWords: ["behind on rent", "landlord text"],
		},
		{
			at: at(45, 21),
			domains: ["money"],
			emotion: "dread",
			id: "m2",
			intensity: 7,
			theirWords: ["behind on savings", "counting what's left"],
		},
		{
			at: at(22, 20),
			domains: ["money"],
			emotion: "anxiety",
			id: "m3",
			intensity: 6,
			theirWords: ["behind again", "bank app"],
		},
		{
			at: at(8, 20),
			domains: ["money"],
			emotion: "worry",
			id: "m4",
			intensity: 6,
			theirWords: ["rent going up"],
		},
		// Where relief came from.
		{
			at: at(64, 18),
			domains: ["family"],
			emotion: "warmth",
			good: true,
			id: "f1",
			intensity: 3,
			moodAfter: "lighter",
			theirWords: ["sister's engagement dinner"],
		},
		{
			at: at(37, 23),
			checkIn: {
				answer: "processed",
				whatHelped:
					"being with my sister, phone off, not thinking about work at all",
			},
			domains: ["family"],
			emotion: "joy",
			good: true,
			id: "f2",
			intensity: 2,
			moodAfter: "lighter",
			theirWords: [
				"my sister's wedding",
				"danced all night",
				"phone off all day",
			],
		},
	],
};

const THIN: Fixture = {
	domains: { work: { steadiness: 60, usual: 62 } },
	sessions: [
		{
			at: at(9, 18),
			domains: ["work"],
			emotion: "tiredness",
			id: "t1",
			intensity: 4,
			theirWords: ["long week"],
		},
		{
			at: at(5, 18),
			domains: ["work"],
			emotion: "frustration",
			id: "t2",
			intensity: 5,
			theirWords: ["busy"],
		},
		{
			at: at(2, 18),
			domains: ["work"],
			emotion: "tiredness",
			id: "t3",
			intensity: 4,
			theirWords: ["tired"],
		},
	],
};

const textOf = (s: FixtureSession) =>
	`${s.emotion} | ${s.theirWords.join(", ")}`;

/** The real get_domain_steadiness output, with RAG stood in for by shared words. */
const view = (f: Fixture) => {
	const sessions = [...f.sessions].sort((a, b) => b.at - a.at);
	const raw: FactSession[] = sessions.map((s) => ({
		alsoAbout: s.alsoAbout ?? [],
		at: s.at,
		checkIn: s.checkIn?.answer ?? null,
		domains: s.domains,
		good: s.good ?? false,
		id: s.id,
		intensity: s.intensity,
		moodAfter: s.moodAfter ?? null,
		text: textOf(s),
		theirWords: s.theirWords,
	}));
	const wordsOf = (t: string) =>
		new Set(t.toLowerCase().match(/[a-z']{4,}/g) ?? []);
	const search = async (query: string) => {
		const q = wordsOf(query);
		return sessions
			.map((s) => ({
				hits: [...wordsOf(textOf(s))].filter((w) => q.has(w)).length,
				id: s.id,
			}))
			.filter((s) => s.hits > 0)
			.sort((a, b) => b.hits - a.hits)
			.slice(0, 8)
			.map((s) => s.id);
	};
	return steadinessView(
		{
			domains: Object.entries(f.domains).map(([domain, d]) => ({
				compounding: d.compounding ?? null,
				domain,
				label: DOMAIN_LABELS[domain as Domain],
				quietSince: d.quietSince ?? null,
				steadiness: d.steadiness,
				usual: d.usual,
				weekTrend: null,
			})),
			raw,
			sessions: sessions.map((s) => ({
				alsoAbout: s.alsoAbout ?? [],
				checkIn: s.checkIn ?? null,
				chose: s.chose ?? null,
				domains: s.domains,
				emotion: s.emotion,
				id: s.id,
				intensity: s.intensity,
				moodAfter: s.moodAfter ?? null,
				theirWords: s.theirWords,
				when: when(s.at, TZ),
			})),
			timezone: TZ,
			today: when(NOW, TZ),
		},
		{ now: NOW, search }
	);
};

type Outcome = {
	saved: InsightDraft[];
	rejected: { draft: InsightDraft; reason: string }[];
};

async function runPass(f: Fixture): Promise<Outcome> {
	const evidence = {
		domains: new Map(
			Object.entries(f.domains).map(([d, n]) => [
				d as Domain,
				{ baseline: n.usual, steadiness: n.steadiness },
			])
		),
		sessions: new Map<string, CitableSession>(
			f.sessions.map((s) => [
				s.id,
				{
					at: s.at,
					checkedIn: !!s.checkIn,
					domains: s.domains,
					id: s.id,
					lighter:
						s.moodAfter === "lighter" ||
						s.checkIn?.answer === "lighter" ||
						s.checkIn?.answer === "processed",
				},
			])
		),
	};
	const out: Outcome = { rejected: [], saved: [] };
	const steadiness = JSON.stringify(await view(f));
	const tool = (name: string, input: Record<string, unknown>): string => {
		switch (name) {
			case "read_semantic_profile":
				return JSON.stringify({ rendered: null, version: null });
			case "get_domain_steadiness":
				return steadiness;
			case "search_episodic_memory":
				return JSON.stringify({ matches: [] });
			case "write_insight": {
				const draft = input as InsightDraft;
				const r = gateInsight(draft, evidence);
				if (r.ok) {
					out.saved.push(draft);
				} else {
					out.rejected.push({ draft, reason: r.reason });
				}
				return r.ok ? "Saved." : `Rejected, not saved: ${r.reason}`;
			}
			case WRITE_TOOL:
				return "New profile version written.";
			default:
				return JSON.stringify([]);
		}
	};

	const messages: Anthropic.MessageParam[] = [
		{
			content:
				"Consolidate this person's emotional profile. Read the current profile first, gather evidence with the read tools, write any steadiness insights that pass the bar, then write the new version once.",
			role: "user",
		},
	];
	for (let i = 0; i < 12; i++) {
		const res = await getAnthropicClient().messages.create(
			{
				max_tokens: 3072,
				messages,
				model: REFLECTION_CONSOLIDATION_MODEL,
				system: buildConsolidationSystemPrompt({ insights: true }),
				thinking: thinkingOff(REFLECTION_CONSOLIDATION_MODEL),
				tools: [...REFLECTION_TOOLS, ...INSIGHT_TOOLS],
			},
			{ timeout: 120_000 }
		);
		messages.push({ content: res.content, role: "assistant" });
		if (res.stop_reason !== "tool_use") {
			break;
		}
		const calls = res.content.filter(
			(b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
		);
		messages.push({
			content: calls.map((b) => ({
				content: tool(b.name, b.input as Record<string, unknown>),
				tool_use_id: b.id,
				type: "tool_result" as const,
			})),
			role: "user",
		});
		if (calls.some((b) => b.name === WRITE_TOOL)) {
			break;
		}
	}
	return out;
}

/** Printed, and appended to $EVAL_OUT when set: the artifact a person reads to judge the bar. */
const report = (label: string, o: Outcome) => {
	const out =
		`\n── ${label} ──\n` +
		o.saved
			.map(
				(d) =>
					`SAVED  [${d.kind} ${d.domains.join("+")}] ${d.text}  (cites ${d.citedSessionIds.join(", ")})`
			)
			.join("\n") +
		(o.rejected.length ? "\n" : "") +
		o.rejected
			.map(
				(r) =>
					`REJECT [${r.draft.kind} ${r.draft.domains?.join("+")}] ${r.draft.text}\n       ↳ ${r.reason}`
			)
			.join("\n");
	console.log(out);
	if (process.env.EVAL_OUT) {
		appendFileSync(process.env.EVAL_OUT, `${out}\n`);
	}
};

describe("steadiness insights (live)", () => {
	it.skipIf(!hasApiKey())(
		"finds revelations for a person who has them, overall and per domain",
		async () => {
			const o = await runPass(RICH);
			report("rich", o);
			expect(o.saved.length).toBeGreaterThanOrEqual(2);
			expect(o.saved.some((d) => isOverall(d.kind))).toBe(true);
			expect(o.saved.some((d) => !isOverall(d.kind))).toBe(true);
		},
		300_000
	);

	it.skipIf(!hasApiKey())(
		"writes nothing for thin evidence",
		async () => {
			const o = await runPass(THIN);
			report("thin", o);
			expect(o.saved).toEqual([]);
		},
		300_000
	);
});
