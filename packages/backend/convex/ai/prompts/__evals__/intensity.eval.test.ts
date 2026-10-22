/**
 * Intensity release gate (#516): run before any classifier prompt or model
 * change ships. Steadiness trusts stored intensity (ADR 0019), so a change
 * that moves it moves every score.
 *
 * Run: `bun run test:evals:intensity` (needs ANTHROPIC_API_KEY; skips cleanly without).
 *
 * Gates, all against the reference means in intensity.fixtures.eval.ts:
 *   1. Positive probe (#494): good news still lands in the joy/love family, so
 *      the valence guard holds its session reading at 75 or above.
 *   2. Length-bias audit (#493): long − short stays within ±1 of the
 *      reference, vivid and composed pairs apart (intensity is ordinal ±1).
 *      The 161-session dev-data half of #493 isn't ported (raw text can't be
 *      exported); the hand pairs are the gate.
 *   3. Shift: the mean move from the reference must match this version's
 *      INTENSITY_OFFSET within 0.5. If it fails, record the printed shift in
 *      `convex/compounding/readings.ts` — never re-baseline the fixtures.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { INTENSITY_OFFSET, readingsFromSession } from "../../../compounding/readings";
import { emotionFamily } from "../../../lib/understandingVocab";
import {
  CLASSIFIER_MODEL,
  CLASSIFIER_VERSION,
  getAnthropicClient,
  parseClassificationResponse,
  thinkingOff,
} from "../../providers/anthropic";
import { buildClassifierPrompt } from "../classifier";
import { hasApiKey } from "./harness.eval";
import { PAIRS, POSITIVE } from "./intensity.fixtures.eval";

const REPS = 3;
const SHIFT_TOLERANCE = 0.5;
const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;

type Scored = { emotions: string[]; intensity: number };

async function classify(text: string) {
  const p = buildClassifierPrompt(text, "(no prior pattern context)", false, "open_prompt");
  const res = await getAnthropicClient().messages.create({
    model: CLASSIFIER_MODEL,
    max_tokens: 500,
    thinking: thinkingOff(CLASSIFIER_MODEL),
    system: p.system,
    messages: [{ role: "user", content: p.user }],
  });
  const t = res.content.find((b) => b.type === "text");
  return parseClassificationResponse(t && t.type === "text" ? t.text : "{}");
}

async function score(text: string): Promise<Scored> {
  const runs = await Promise.all(Array.from({ length: REPS }, () => classify(text)));
  return { emotions: runs.map((r) => r.primaryEmotion), intensity: mean(runs.map((r) => r.intensity)) };
}

const positiveFamily = (e: string) => emotionFamily(e).some((f) => f === "joy" || f === "love");

describe.skipIf(!hasApiKey())(`intensity release gate: ${CLASSIFIER_VERSION}`, () => {
  const scored = new Map<string, Scored>();
  const offset = INTENSITY_OFFSET[CLASSIFIER_VERSION];

  beforeAll(async () => {
    const texts = [...POSITIVE.map((p) => p.text), ...PAIRS.flatMap((p) => [p.short, p.long])];
    // One text at a time (REPS in flight): low usage tiers cap concurrent requests.
    for (const t of new Set(texts)) scored.set(t, await score(t));
  }, 300_000);

  for (const p of POSITIVE.filter((x) => x.family)) {
    // The guard keys on family, so classing good news as joy/love is what holds the 75.
    it(`positive probe: ${p.id} classes as joy/love, reading 75 or above`, () => {
      const s = scored.get(p.text)!;
      expect(s.emotions.every(positiveFamily), `classed ${s.emotions.join(", ")}`).toBe(true);
      for (const emotion of s.emotions) {
        const [reading] = readingsFromSession({
          at: 0,
          intensity: s.intensity,
          intensityOffset: offset,
          primaryEmotion: emotion,
          thematicTags: ["work"],
          followUps: [],
        });
        expect(reading.value).toBeGreaterThanOrEqual(75);
      }
    });
  }

  // Per register, so a widening register effect can't cancel out across groups.
  for (const composed of [false, true]) {
    it(`length-bias audit (${composed ? "composed" : "vivid"}): long − short stays within ±1 of the reference`, () => {
      const pairs = PAIRS.filter((p) => !!p.composed === composed);
      const delta = mean(pairs.map((p) => scored.get(p.long)!.intensity - scored.get(p.short)!.intensity));
      const refDelta = mean(pairs.map((p) => p.refLong - p.refShort));
      expect(
        Math.abs(delta - refDelta),
        `mean(long − short) = ${delta.toFixed(2)}, reference ${refDelta.toFixed(2)}`,
      ).toBeLessThanOrEqual(1);
    });
  }

  it("intensity shift from the reference is recorded as this version's offset", () => {
    const refs = [
      ...POSITIVE.map((p) => [p.text, p.ref] as const),
      ...PAIRS.flatMap((p) => [[p.short, p.refShort], [p.long, p.refLong]] as const),
    ];
    const shift = mean(refs.map(([text, ref]) => scored.get(text)!.intensity - ref));
    expect(
      Math.abs(shift - (offset ?? NaN)),
      `intensity shifted by ${shift.toFixed(2)} from the reference. Bump CLASSIFIER_VERSION if you haven't ` +
        `(an offset on an existing version re-scores its stored history), then set INTENSITY_OFFSET[<new version>] = ${shift.toFixed(1)}`,
    ).toBeLessThanOrEqual(SHIFT_TOLERANCE);
  });
});
