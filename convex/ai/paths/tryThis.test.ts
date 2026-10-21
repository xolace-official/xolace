import { describe, expect, it } from "vitest";
import { CATALOG } from "./catalog";
import { TRY_THIS, isTryThis, rankTryThis } from "./tryThis";
import { PRIMARY_EMOTIONS, THEMATIC_TAGS } from "../../lib/understandingVocab";
import { buildClassifierPrompt } from "../prompts/classifier";

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
    expect(CATALOG.filter((c) => isTryThis(c.actionType))).toEqual([...TRY_THIS]);
  });

  it.each(TRY_THIS.map((t) => [t.actionType, t] as const))("%s passes the curation limits", (_, t) => {
    expect(t.actionType).toMatch(/^try_[a-z0-9_]+$/);
    expect(t.emotions.length).toBeGreaterThan(0);
    for (const e of t.emotions) expect(PRIMARY_EMOTIONS).toContain(e);
    expect(t.themes.length).toBeGreaterThan(0);
    expect(t.title!.length).toBeLessThanOrEqual(32);
    expect(t.detail!.length).toBeLessThanOrEqual(200);
    expect(t.title).not.toMatch(FORBIDDEN);
    expect(t.detail).not.toMatch(FORBIDDEN);
    expect(t.humanContact).toBe(false);
    expect(t.modelDescription).toContain(t.detail);
  });

  it("tags the new themes, which the classifier can emit", () => {
    const { system } = buildClassifierPrompt("x", "", false, "open_prompt");
    for (const theme of ["news", "comparison"]) {
      expect(THEMATIC_TAGS).toContain(theme);
      expect(system).toContain(`"${theme}"`);
      expect(TRY_THIS.some((t) => t.themes.includes(theme))).toBe(true);
    }
  });
});

describe("rankTryThis (#571)", () => {
  const u = (primaryEmotion: string, thematicTags: string[] = [], userLanguageTags: string[] = []) => ({
    primaryEmotion,
    thematicTags,
    userLanguageTags,
  });
  const keys = (rows: readonly { actionType: string }[]) => rows.map((r) => r.actionType);

  it("keeps every entry exactly once", () => {
    expect([...keys(rankTryThis(TRY_THIS, u("anxiety", ["sleep"])))].sort()).toEqual([...keys(TRY_THIS)].sort());
  });

  it("keeps catalog order when nothing matches", () => {
    expect(keys(rankTryThis(TRY_THIS, u("surprise")))).toEqual(keys(TRY_THIS));
  });

  it("puts the closest tags first, catalog order on a tie", () => {
    const ranked = keys(rankTryThis(TRY_THIS, u("fear", ["news"])));
    expect(ranked.slice(0, 2)).toEqual(["try_news_at_set_times", "try_muscle_release"]);
  });

  it("meets a child emotion through its parent, and their words as a theme", () => {
    expect(keys(rankTryThis(TRY_THIS, u("stress", [], ["Racing  Thoughts"])))[0]).toBe("try_screens_off_hour");
  });
});
