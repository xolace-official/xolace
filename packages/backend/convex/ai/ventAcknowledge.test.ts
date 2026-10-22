import { describe, expect, it } from "vitest";
import { buildVentAcknowledgePrompt } from "./ventAcknowledge";

const TRANSCRIPT = "I don't even know where to start today, it's just been a lot.";
const PROFILE = "Recurring themes: overwork, self-doubt\nRecent trajectory: gradually lighter";

describe("buildVentAcknowledgePrompt", () => {
  it("leaves the system prompt byte-for-byte unchanged when no profile is passed", () => {
    const withoutArg = buildVentAcknowledgePrompt(TRANSCRIPT);
    const withNull = buildVentAcknowledgePrompt(TRANSCRIPT, null);
    expect(withoutArg.system).toBe(withNull.system);
    expect(withNull.system).not.toContain("What you know about this person");
  });

  it("appends the attunement guard line and profile text when a profile is present", () => {
    const { system } = buildVentAcknowledgePrompt(TRANSCRIPT, PROFILE);
    expect(system).toContain(
      "What you know about this person may shape your warmth and word choice.",
    );
    expect(system).toContain(
      "NEVER reference past sessions, name specifics, or imply you've been tracking them. Stay in this moment.",
    );
    expect(system).toContain(PROFILE);
  });

  it("keeps the reply-format instruction as the final line even with a profile present", () => {
    const { system } = buildVentAcknowledgePrompt(TRANSCRIPT, PROFILE);
    expect(system.trim().endsWith(
      "Reply ONLY with the enhanced text — no labels, no explanation, no preamble.",
    )).toBe(true);
  });

  it("never echoes the profile text verbatim in a way that overrides the NEVER rules (golden-set check)", () => {
    const { system } = buildVentAcknowledgePrompt(TRANSCRIPT, PROFILE);
    const neverRulesIndex = system.indexOf('NEVER output these forms');
    const guardLineIndex = system.indexOf("What you know about this person");
    expect(neverRulesIndex).toBeGreaterThan(-1);
    expect(guardLineIndex).toBeGreaterThan(neverRulesIndex);
  });
});
