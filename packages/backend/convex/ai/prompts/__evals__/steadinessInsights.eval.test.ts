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
import { gateInsight, isOverall, type CitableSession, type InsightDraft } from "../../../compounding/insightGate";
import { when } from "../../../compounding/insightEvidence";
import type { FactSession } from "../../../compounding/insightFacts";
import type { Domain } from "../../../lib/understandingVocab";
import { DOMAIN_LABELS } from "../../../lib/understandingVocab";
import { getAnthropicClient, REFLECTION_CONSOLIDATION_MODEL, thinkingOff } from "../../providers/anthropic";
import { INSIGHT_TOOLS, steadinessView } from "../../reflectionAgent/insightTools";
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
  domains: Record<string, { steadiness: number; usual: number; quietSince?: string; compounding?: object }>;
};

const SOLO = "stayed with it a while (Sit with this)";
const EXIT = "just needed to say it, and left";
const heavier = { answer: "heavier", whatHelped: null };
const RICH: Fixture = {
  sessions: [
    // Friends, until work got heavy.
    { id: "l1", at: at(121, 19), domains: ["love"], alsoAbout: ["friendships"], emotion: "contentment", intensity: 3, good: true, theirWords: ["Friday drinks with Ade and Tomi", "laughed till it hurt"], moodAfter: "lighter" },
    { id: "l2", at: at(110, 20), domains: ["love"], alsoAbout: ["friendships"], emotion: "longing", intensity: 5, theirWords: ["group chat's gone quiet", "miss the gang"], moodAfter: "same" },
    { id: "l3", at: at(101, 18), domains: ["love"], alsoAbout: ["friendships"], emotion: "warmth", intensity: 3, good: true, theirWords: ["Tomi's birthday", "felt like myself"], moodAfter: "lighter" },
    { id: "l4", at: at(92, 21), domains: ["love"], alsoAbout: ["friendships"], emotion: "guilt", intensity: 5, theirWords: ["cancelled on Ade again", "no energy for anyone"], moodAfter: "same" },
    // Work gets heavy from mid-July; ends "fine", checks in heavier.
    { id: "w1", at: at(85, 9), domains: ["work"], emotion: "overwhelm", intensity: 7, theirWords: ["new manager", "behind before I've started"], chose: SOLO, moodAfter: "same", checkIn: heavier },
    { id: "w2", at: at(78, 22), domains: ["work"], emotion: "anxiety", intensity: 7, theirWords: ["it's fine, just busy", "behind on the roadmap"], chose: EXIT, moodAfter: "same", checkIn: heavier },
    { id: "w3", at: at(62, 9), domains: ["work"], emotion: "frustration", intensity: 6, theirWords: ["fine really", "everyone else keeps up"], chose: SOLO, moodAfter: "lighter", checkIn: heavier },
    { id: "w4", at: at(47, 21), domains: ["work"], emotion: "dread", intensity: 8, theirWords: ["behind on everything", "Monday already"], chose: EXIT, moodAfter: "same", checkIn: heavier },
    { id: "w5", at: at(40, 13), domains: ["work"], emotion: "tiredness", intensity: 6, theirWords: ["it's fine", "just tired"], moodAfter: "same", checkIn: { answer: "still_here", whatHelped: null } },
    { id: "w6", at: at(26, 22), domains: ["work"], emotion: "overwhelm", intensity: 7, theirWords: ["behind again", "fine, I'll sort it"], chose: EXIT, moodAfter: "same", checkIn: heavier },
    { id: "w7", at: at(12, 9), domains: ["work"], emotion: "anxiety", intensity: 6, theirWords: ["fine", "catching up at weekends"], chose: SOLO, moodAfter: "lighter", checkIn: heavier },
    { id: "w8", at: at(4, 21), domains: ["work"], emotion: "exhaustion", intensity: 7, theirWords: ["behind", "can't see the end of it"], moodAfter: "same" },
    // Sleep and money, both "behind".
    { id: "h1", at: at(75, 2), domains: ["health"], emotion: "restlessness", intensity: 7, theirWords: ["lying awake doing the maths of what I'm behind on"] },
    { id: "h2", at: at(50, 3), domains: ["health"], emotion: "exhaustion", intensity: 7, theirWords: ["behind on sleep", "4am again"] },
    { id: "h3", at: at(30, 1), domains: ["health", "work"], emotion: "restlessness", intensity: 6, theirWords: ["replaying the standup", "behind"] },
    { id: "h4", at: at(15, 2), domains: ["health"], emotion: "exhaustion", intensity: 7, theirWords: ["can't switch off", "behind on rest"] },
    { id: "m1", at: at(68, 20), domains: ["money"], emotion: "worry", intensity: 6, theirWords: ["behind on rent", "landlord text"] },
    { id: "m2", at: at(45, 21), domains: ["money"], emotion: "dread", intensity: 7, theirWords: ["behind on savings", "counting what's left"] },
    { id: "m3", at: at(22, 20), domains: ["money"], emotion: "anxiety", intensity: 6, theirWords: ["behind again", "bank app"] },
    { id: "m4", at: at(8, 20), domains: ["money"], emotion: "worry", intensity: 6, theirWords: ["rent going up"] },
    // Where relief came from.
    { id: "f1", at: at(64, 18), domains: ["family"], emotion: "warmth", intensity: 3, good: true, theirWords: ["sister's engagement dinner"], moodAfter: "lighter" },
    { id: "f2", at: at(37, 23), domains: ["family"], emotion: "joy", intensity: 2, good: true, theirWords: ["my sister's wedding", "danced all night", "phone off all day"], moodAfter: "lighter", checkIn: { answer: "processed", whatHelped: "being with my sister, phone off, not thinking about work at all" } },
  ],
  domains: {
    work: { steadiness: 44, usual: 63, compounding: { state: "compounding", since: when(at(85, 9), TZ), linkedOnsetOrder: [`work (${when(at(85, 9), TZ)})`, `health (${when(at(75, 2), TZ)})`] } },
    health: { steadiness: 52, usual: 60 },
    money: { steadiness: 55, usual: 62 },
    love: { steadiness: 70, usual: 70, quietSince: when(at(92, 21), TZ) },
    family: { steadiness: 84, usual: 78 },
  },
};

const THIN: Fixture = {
  sessions: [
    { id: "t1", at: at(9, 18), domains: ["work"], emotion: "tiredness", intensity: 4, theirWords: ["long week"] },
    { id: "t2", at: at(5, 18), domains: ["work"], emotion: "frustration", intensity: 5, theirWords: ["busy"] },
    { id: "t3", at: at(2, 18), domains: ["work"], emotion: "tiredness", intensity: 4, theirWords: ["tired"] },
  ],
  domains: { work: { steadiness: 60, usual: 62 } },
};

const textOf = (s: FixtureSession) => `${s.emotion} | ${s.theirWords.join(", ")}`;

/** The real get_domain_steadiness output, with RAG stood in for by shared words. */
const view = (f: Fixture) => {
  const sessions = [...f.sessions].sort((a, b) => b.at - a.at);
  const raw: FactSession[] = sessions.map((s) => ({
    id: s.id, at: s.at, domains: s.domains, intensity: s.intensity, good: s.good ?? false,
    moodAfter: s.moodAfter ?? null, checkIn: s.checkIn?.answer ?? null, alsoAbout: s.alsoAbout ?? [],
    theirWords: s.theirWords, text: textOf(s),
  }));
  const wordsOf = (t: string) => new Set(t.toLowerCase().match(/[a-z']{4,}/g) ?? []);
  const search = async (query: string) => {
    const q = wordsOf(query);
    return sessions
      .map((s) => ({ id: s.id, hits: [...wordsOf(textOf(s))].filter((w) => q.has(w)).length }))
      .filter((s) => s.hits > 0)
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 8)
      .map((s) => s.id);
  };
  return steadinessView(
    {
      today: when(NOW, TZ),
      timezone: TZ,
      domains: Object.entries(f.domains).map(([domain, d]) => ({
        domain, label: DOMAIN_LABELS[domain as Domain], steadiness: d.steadiness, usual: d.usual, weekTrend: null,
        quietSince: d.quietSince ?? null, compounding: d.compounding ?? null,
      })),
      sessions: sessions.map((s) => ({
        id: s.id, when: when(s.at, TZ), domains: s.domains, alsoAbout: s.alsoAbout ?? [], emotion: s.emotion, intensity: s.intensity,
        theirWords: s.theirWords, chose: s.chose ?? null, moodAfter: s.moodAfter ?? null, checkIn: s.checkIn ?? null,
      })),
      raw,
    },
    { now: NOW, search },
  );
};

type Outcome = { saved: InsightDraft[]; rejected: { draft: InsightDraft; reason: string }[] };

async function runPass(f: Fixture): Promise<Outcome> {
  const evidence = {
    sessions: new Map<string, CitableSession>(f.sessions.map((s) => [s.id, {
      id: s.id, at: s.at, domains: s.domains, checkedIn: !!s.checkIn,
      lighter: s.moodAfter === "lighter" || s.checkIn?.answer === "lighter" || s.checkIn?.answer === "processed",
    }])),
    domains: new Map(Object.entries(f.domains).map(([d, n]) => [d as Domain, { steadiness: n.steadiness, baseline: n.usual }])),
  };
  const out: Outcome = { saved: [], rejected: [] };
  const steadiness = JSON.stringify(await view(f));
  const tool = (name: string, input: Record<string, unknown>): string => {
    switch (name) {
      case "read_semantic_profile": return JSON.stringify({ version: null, rendered: null });
      case "get_domain_steadiness": return steadiness;
      case "search_episodic_memory": return JSON.stringify({ matches: [] });
      case "write_insight": {
        const draft = input as InsightDraft;
        const r = gateInsight(draft, evidence);
        if (r.ok) out.saved.push(draft);
        else out.rejected.push({ draft, reason: r.reason });
        return r.ok ? "Saved." : `Rejected, not saved: ${r.reason}`;
      }
      case WRITE_TOOL: return "New profile version written.";
      default: return JSON.stringify([]);
    }
  };

  const messages: Anthropic.MessageParam[] = [{
    role: "user",
    content: "Consolidate this person's emotional profile. Read the current profile first, gather evidence with the read tools, write any steadiness insights that pass the bar, then write the new version once.",
  }];
  for (let i = 0; i < 12; i++) {
    const res = await getAnthropicClient().messages.create(
      { model: REFLECTION_CONSOLIDATION_MODEL, max_tokens: 3072, thinking: thinkingOff(REFLECTION_CONSOLIDATION_MODEL), system: buildConsolidationSystemPrompt({ insights: true }), tools: [...REFLECTION_TOOLS, ...INSIGHT_TOOLS], messages },
      { timeout: 120_000 },
    );
    messages.push({ role: "assistant", content: res.content });
    if (res.stop_reason !== "tool_use") break;
    const calls = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    messages.push({ role: "user", content: calls.map((b) => ({ type: "tool_result" as const, tool_use_id: b.id, content: tool(b.name, b.input as Record<string, unknown>) })) });
    if (calls.some((b) => b.name === WRITE_TOOL)) break;
  }
  return out;
}

/** Printed, and appended to $EVAL_OUT when set: the artifact a person reads to judge the bar. */
const report = (label: string, o: Outcome) => {
  const out =
    `\n── ${label} ──\n` +
    o.saved.map((d) => `SAVED  [${d.kind} ${d.domains.join("+")}] ${d.text}  (cites ${d.citedSessionIds.join(", ")})`).join("\n") +
    (o.rejected.length ? "\n" : "") +
    o.rejected.map((r) => `REJECT [${r.draft.kind} ${r.draft.domains?.join("+")}] ${r.draft.text}\n       ↳ ${r.reason}`).join("\n");
  console.log(out);
  if (process.env.EVAL_OUT) appendFileSync(process.env.EVAL_OUT, `${out}\n`);
};

describe("steadiness insights (live)", () => {
  it.skipIf(!hasApiKey())("finds revelations for a person who has them, overall and per domain", async () => {
    const o = await runPass(RICH);
    report("rich", o);
    expect(o.saved.length).toBeGreaterThanOrEqual(2);
    expect(o.saved.some((d) => isOverall(d.kind))).toBe(true);
    expect(o.saved.some((d) => !isOverall(d.kind))).toBe(true);
  }, 300_000);

  it.skipIf(!hasApiKey())("writes nothing for thin evidence", async () => {
    const o = await runPass(THIN);
    report("thin", o);
    expect(o.saved).toEqual([]);
  }, 300_000);
});
