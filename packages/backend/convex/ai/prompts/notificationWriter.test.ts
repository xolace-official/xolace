import { describe, expect, it } from "vitest";
import { buildNotificationPrompt, type NotificationContext } from "./notificationWriter";

const baseCtx: NotificationContext = {
  notificationType: "gentle_return",
  reach: "warm",
  sessionCount: 6,
  currentStreak: 2,
  hoursSinceLastSession: 30,
  dominantEmotionTags: ["heavy", "tight"],
  userLanguageTags: ["overwhelmed", "stuck"],
  typicalUsagePattern: null,
  lastSessionMood: "lighter",
  lastMirrorConfirmation: "confirmed",
  semanticProfile: null,
};

describe("buildNotificationPrompt", () => {
  describe("cold-start fallback (no semantic profile)", () => {
    it("uses the recency-only context and omits the profile section", () => {
      const { user } = buildNotificationPrompt({ ...baseCtx, semanticProfile: null });

      expect(user).toContain("Words this user uses: overwhelmed, stuck");
      expect(user).toContain("Patterns they carry: heavy, tight");
      expect(user).not.toContain("Longitudinal profile:");
      expect(user).not.toContain("Recent signal (last few days):");
    });
  });

  describe("profile-present (Cognition Layer)", () => {
    it("leads with the rendered profile and folds the tags in as a recency signal", () => {
      const semanticProfile = "Recurring themes: overwork, self-doubt\nRecent trajectory: gradually lighter";
      const { user } = buildNotificationPrompt({ ...baseCtx, semanticProfile });

      expect(user).toContain("Longitudinal profile:\n" + semanticProfile);
      expect(user).toContain("Recent signal (last few days):");
      expect(user).toContain("Words this user uses: overwhelmed, stuck");
      expect(user.indexOf("Longitudinal profile:")).toBeLessThan(
        user.indexOf("Recent signal (last few days):"),
      );
    });
  });
});
