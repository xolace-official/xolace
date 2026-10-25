import { describe, expect, it } from "vitest";
import { PRIMARY_EMOTIONS, THEMATIC_TAGS } from "../../lib/understandingVocab";
import { buildClassifierPrompt } from "../prompts/classifier";
import { CATALOG } from "./catalog";
import { withhold } from "./history";
import { isTryThis, TRY_THIS } from "./tryThis";

/**
 * Curation limits (#567, #571): what each try-this entry may never be.
 * Failure modes: an entry missing from the catalog or duplicated; an emotion
 * outside the Understanding's words (a silent never-match); wording that
 * slips into medication, diet, a specific person, crisis help or a cost;
 * a card title or step too long to read at a glance.
 */
const FORBIDDEN =
	/\b(medication|medicine|pills?|doctor|gp|therap(y|ist)|diagnos\w*|crisis|helpline|hotline|emergency|call|phone (him|her|them)|text (him|her|them)|alcohol|drink|caffeine|coffee|diet|eat|meal|buy|pay|subscribe|quit)\b/i;

describe("try-this catalog (#571)", () => {
	it("ships all 34 researched entries, once each, in the catalog", () => {
		expect(TRY_THIS).toHaveLength(34);
		expect(new Set(TRY_THIS.map((t) => t.actionType)).size).toBe(34);
		expect(CATALOG.filter((c) => isTryThis(c.actionType))).toEqual([
			...TRY_THIS,
		]);
	});

	it.each(TRY_THIS.map((t) => [t.actionType, t] as const))(
		"%s passes the curation limits",
		(_, t) => {
			expect(t.actionType).toMatch(/^try_[a-z0-9_]+$/);
			expect(t.emotions.length).toBeGreaterThan(0);
			for (const e of t.emotions) {
				expect(PRIMARY_EMOTIONS).toContain(e);
			}
			expect(t.themes.length).toBeGreaterThan(0);
			expect(t.title!.length).toBeLessThanOrEqual(32);
			expect(t.detail!.length).toBeLessThanOrEqual(200);
			expect(t.title).not.toMatch(FORBIDDEN);
			expect(t.detail).not.toMatch(FORBIDDEN);
			expect(t.humanContact).toBe(false);
			expect(t.modelDescription).toContain(t.detail);
		}
	);

	it("tags the new themes, which the classifier can emit", () => {
		const { system } = buildClassifierPrompt("x", "", false, "open_prompt");
		for (const theme of ["news", "comparison"]) {
			expect(THEMATIC_TAGS).toContain(theme);
			expect(system).toContain(`"${theme}"`);
			expect(TRY_THIS.some((t) => t.themes.includes(theme))).toBe(true);
		}
	});
});

describe("withhold counts try-this as one slot (#567)", () => {
	const types = (...actionTypes: string[]) =>
		actionTypes.map((actionType) => ({ actionType }));
	const catalog = types("breathing", "bridge", "xolacer", "try_a", "try_b");

	it("keeps a skipped type when two try-this entries would only pad the count to MAX_TWIGS", () => {
		expect(withhold(catalog, ["bridge"]).withheld).toEqual([]);
	});

	it("withholds a skipped try-this while a sibling still fills the slot", () => {
		expect(withhold(catalog, ["try_a"]).withheld).toEqual(["try_a"]);
	});
});
