import { describe, expect, it } from "vitest";
import {
  buildFollowUpCardPrompt,
  fallbackFollowUpCard,
  type FollowUpCardContext,
} from "./followUpCardWriter";

const baseCtx: FollowUpCardContext = {
  tier: "standard",
  mirrorText: "You're carrying more than you're letting on.",
  followUpReason: "high intensity, unresolved",
  primaryEmotion: "heavy",
  granularLabel: "weighed down",
  gaveUp: false,
  semanticProfile: null,
};

const PROFILE = "Recurring themes: overwork, self-doubt\nRecent trajectory: gradually lighter";

describe("buildFollowUpCardPrompt", () => {
  describe("semantic profile continuity line", () => {
    for (const tier of ["standard", "elevated"] as const) {
      it(`leads with the continuity line for ${tier} tier when a profile is present`, () => {
        const { user } = buildFollowUpCardPrompt({ ...baseCtx, tier, semanticProfile: PROFILE });
        expect(user).toContain(`How this sits in their larger pattern: ${PROFILE}`);
      });

      it(`omits the continuity line for ${tier} tier when the profile is null (cold-start, unchanged output)`, () => {
        const { user } = buildFollowUpCardPrompt({ ...baseCtx, tier, semanticProfile: null });
        expect(user).not.toContain("How this sits in their larger pattern:");
      });
    }

    it("never includes the continuity line for acute tier, even if a profile is passed in", () => {
      const { user, system } = buildFollowUpCardPrompt({
        ...baseCtx,
        tier: "acute",
        semanticProfile: PROFILE,
      });
      expect(user).not.toContain("How this sits in their larger pattern:");
      expect(system).toContain("NEVER reference a longer-term pattern or history");
    });
  });

  describe("gave_up branch (mirror-free)", () => {
    it("stays mirror-free and does not quote mirrorText even if present", () => {
      const { user } = buildFollowUpCardPrompt({ ...baseCtx, gaveUp: true, mirrorText: "should not appear" });
      expect(user).not.toContain("Mirror they confirmed:");
      expect(user).toContain("the mirror never landed");
    });
  });

  describe("acute tier presence-only copy", () => {
    it("keeps the existing presence-first tone and crisis NEVER rules", () => {
      const { system } = buildFollowUpCardPrompt({ ...baseCtx, tier: "acute" });
      expect(system).toContain("PRESENCE check, not a processing prompt");
      expect(system).toContain("NEVER name a crisis, a method, or anything alarming");
    });
  });
});

describe("fallbackFollowUpCard", () => {
  it("is tier-aware", () => {
    expect(fallbackFollowUpCard("acute")).not.toEqual(fallbackFollowUpCard("standard"));
  });
});
