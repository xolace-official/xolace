import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { rankReplace } from "../lib/aggregates";

/**
 * Update emotional profile stats after a session completes.
 * Updates sessionCount, dominantEmotionTags, averageSessionDuration.
 */
export const updateAfterSession = internalMutation({
  args: {
    emotionalProfileId: v.id("emotional_profiles"),
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get("emotional_profiles", args.emotionalProfileId);
    if (!profile) return;

    const session = await ctx.db.get("sessions", args.sessionId);
    if (!session || session.state !== "completed") return;

    const now = Date.now();
    const newSessionCount = profile.sessionCount + 1;

    // Update average duration
    let newAvgDuration = profile.averageSessionDuration;
    if (session.sessionDuration) {
      if (profile.averageSessionDuration) {
        // Incremental average
        newAvgDuration =
          profile.averageSessionDuration +
          (session.sessionDuration - profile.averageSessionDuration) /
            newSessionCount;
      } else {
        newAvgDuration = session.sessionDuration;
      }
    }

    // Streak + lastSessionAt moved to recordActivity, called in the same
    // transaction as the completion (sessions.ts finalizeCompletion, #433).

    // Update dominant emotion tags + frequent words from recent metadata.
    // One bounded scan feeds both — words ride along on the emotion loop.
    const recentMetadata = await ctx.db
      .query("emotional_metadata")
      .withIndex("by_profile_theme", (q) =>
        q.eq("emotionalProfileId", args.emotionalProfileId)
      )
      .order("desc")
      .take(50);

    const emotionCounts: Record<string, number> = {};
    // Normalized word frequency: lowercase+trim key so "Stuck"/"stuck" merge.
    const wordCounts = new Map<string, number>();
    for (const m of recentMetadata) {
      emotionCounts[m.primaryEmotion] =
        (emotionCounts[m.primaryEmotion] ?? 0) + 1;
      for (const raw of m.userLanguageTags) {
        const key = raw.toLowerCase().trim();
        if (!key) continue;
        wordCounts.set(key, (wordCounts.get(key) ?? 0) + 1);
      }
    }
    const dominantEmotionTags = Object.entries(emotionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([emotion]) => emotion);

    // Top 10 by count; store extras beyond the teaser's 4 for future use.
    // Only persist genuinely recurring words — singletons (count 1) aren't
    // repetition, so the teaser stays empty until a word actually repeats.
    const frequentWords = [...wordCounts.entries()]
      .filter(([, count]) => count > 1)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));

    // Compute typicalUsagePattern after 5+ sessions
    let typicalUsagePattern = profile.typicalUsagePattern;
    if (newSessionCount >= 5) {
      const allRecent = await ctx.db
        .query("sessions")
        .withIndex("by_profile_time", (q) =>
          q.eq("emotionalProfileId", args.emotionalProfileId)
        )
        .order("desc")
        .take(40);
      const completedRecent = allRecent
        .filter((s) => s.state === "completed")
        .slice(0, 20);

      const timeOfDayToHour: Record<string, number> = {
        early_morning: 6,
        morning: 10,
        afternoon: 14,
        evening: 19,
        late_night: 23,
      };

      const dayCounts: Record<number, number> = {};
      const hourCounts: Record<number, number> = {};
      for (const s of completedRecent) {
        if (s.dayOfWeek !== undefined) {
          dayCounts[s.dayOfWeek] = (dayCounts[s.dayOfWeek] ?? 0) + 1;
        }
        if (s.timeOfDay) {
          const hour = timeOfDayToHour[s.timeOfDay];
          if (hour !== undefined) {
            hourCounts[hour] = (hourCounts[hour] ?? 0) + 1;
          }
        }
      }

      const modeDay = Object.entries(dayCounts).sort(([, a], [, b]) => b - a)[0];
      const modeHour = Object.entries(hourCounts).sort(([, a], [, b]) => b - a)[0];
      if (modeDay && modeHour) {
        typicalUsagePattern = {
          dayOfWeek: Number(modeDay[0]),
          hourOfDay: Number(modeHour[0]),
        };
      }
    }

    await ctx.db.patch("emotional_profiles", args.emotionalProfileId, {
      sessionCount: newSessionCount,
      dominantEmotionTags:
        dominantEmotionTags.length > 0
          ? dominantEmotionTags
          : profile.dominantEmotionTags,
      frequentWords:
        frequentWords.length > 0 ? frequentWords : profile.frequentWords,
      averageSessionDuration: newAvgDuration,
      typicalUsagePattern,
      firstSessionAt: profile.firstSessionAt ?? now,
      updatedAt: now,
    });

    // sessionCount just moved — keep the percentile aggregate in step.
    await rankReplace(ctx, profile);

    // Mark any unresolved notification_log entries within the last 24h as
    // having resulted in a session — covers organic returns (no tap required).
    const ATTRIBUTION_WINDOW_MS = 24 * 60 * 60 * 1000;
    const attributionCutoff = now - ATTRIBUTION_WINDOW_MS;
    const [attributedLog] = await ctx.db
      .query("notification_log")
      .withIndex("by_profile", (q) =>
        q
          .eq("emotionalProfileId", args.emotionalProfileId)
          .gte("sentAt", attributionCutoff)
      )
      .order("desc")
      .take(1);

    if (attributedLog && attributedLog.resultedInSession === undefined) {
      await ctx.db.patch("notification_log", attributedLog._id, { resultedInSession: true });
    }

    // Check for milestone notification
    const milestoneMessages: Record<number, string> = {
      1: "You showed up. That's the hardest part.",
      7: "A week of showing up for yourself. That takes something real.",
      30: "30 sessions. You've built a practice of listening to yourself.",
      100: "100 sessions. What started as a moment has become a practice.",
    };

    const milestoneMessage = milestoneMessages[newSessionCount];
    if (milestoneMessage) {
      // Check if milestone notifications are enabled
      const preferences = await ctx.db
        .query("preferences")
        .withIndex("by_profile", (q) =>
          q.eq("emotionalProfileId", args.emotionalProfileId)
        )
        .unique();

      if (
        preferences?.notifications.enabled &&
        preferences.notifications.milestone
      ) {
        await ctx.scheduler.runAfter(
          0,
          internal.notifications.schedule,
          {
            emotionalProfileId: args.emotionalProfileId,
            type: "milestone",
            content: milestoneMessage,
            triggerReason: `Session count reached ${newSessionCount}`,
            scheduledFor: now,
          }
        );
      }
    }
  },
});
