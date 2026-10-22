import { purgeSessions } from "../lib/sessionCascade";
import { purgeReplyEntries } from "../episodicMemory";
import { BATCH_SIZE, DrainStep } from "./accountDeletionFinalize";

export const drainSessions: DrainStep = async (ctx, profileId) => {
  const sessions = await ctx.db
    .query("sessions")
    .withIndex("by_profile_time", (q) => q.eq("emotionalProfileId", profileId))
    .take(BATCH_SIZE);
  await purgeSessions(ctx, profileId, sessions);
  return sessions.length === BATCH_SIZE;
};

/** Anonymize escalation events — preserved for safety audit. */
export const drainEscalations: DrainStep = async (ctx, profileId) => {
  const escalations = await ctx.db
    .query("escalation_events")
    .withIndex("by_profile", (q) => q.eq("emotionalProfileId", profileId))
    .take(BATCH_SIZE);
  for (const event of escalations) {
    await ctx.db.patch("escalation_events", event._id, { emotionalProfileId: undefined });
  }
  return escalations.length === BATCH_SIZE;
};

export const drainConsentRecords: DrainStep = async (ctx, profileId) => {
  const records = await ctx.db
    .query("consent_records")
    .withIndex("by_profile_type", (q) => q.eq("emotionalProfileId", profileId))
    .take(BATCH_SIZE);
  for (const record of records) await ctx.db.delete("consent_records", record._id);
  return records.length === BATCH_SIZE;
};

export const drainNotifications: DrainStep = async (ctx, profileId) => {
  const notifications = await ctx.db
    .query("notification_log")
    .withIndex("by_profile", (q) => q.eq("emotionalProfileId", profileId))
    .take(BATCH_SIZE);
  for (const notif of notifications) await ctx.db.delete("notification_log", notif._id);
  return notifications.length === BATCH_SIZE;
};

export const drainResonances: DrainStep = async (ctx, profileId) => {
  const resonances = await ctx.db
    .query("reflection_resonances")
    .withIndex("by_profile_reflection", (q) =>
      q.eq("emotionalProfileId", profileId)
    )
    .take(BATCH_SIZE);
  for (const resonance of resonances) await ctx.db.delete("reflection_resonances", resonance._id);
  return resonances.length === BATCH_SIZE;
};

/** Reports this user filed on others' reflections. */
export const drainReports: DrainStep = async (ctx, profileId) => {
  const reports = await ctx.db
    .query("reflection_reports")
    .withIndex("by_profile_reflection", (q) =>
      q.eq("reporterProfileId", profileId)
    )
    .take(BATCH_SIZE);
  for (const report of reports) await ctx.db.delete("reflection_reports", report._id);
  return reports.length === BATCH_SIZE;
};

/**
 * Anonymize emotional feedback (mirror_miss / gave_up / mood). Retained for
 * product signal, stripped of both the owner link and the user's own words.
 */
export const drainFeedback: DrainStep = async (ctx, profileId) => {
  const records = await ctx.db
    .query("feedback")
    .withIndex("by_profile", (q) => q.eq("emotionalProfileId", profileId))
    .take(BATCH_SIZE);
  for (const record of records) {
    await ctx.db.patch("feedback", record._id, {
      emotionalProfileId: undefined,
      text: undefined,
    });
  }
  return records.length === BATCH_SIZE;
};

/**
 * Anonymize product feedback (bug / idea). `text` is deliberately RETAINED —
 * see CONTEXT.md "Feedback retention"; it must never surface user-facing.
 */
export const drainProductFeedback: DrainStep = async (ctx, profileId) => {
  const records = await ctx.db
    .query("product_feedback")
    .withIndex("by_profile_and_created", (q) =>
      q.eq("emotionalProfileId", profileId)
    )
    .take(BATCH_SIZE);
  for (const record of records) {
    await ctx.db.patch("product_feedback", record._id, { emotionalProfileId: undefined });
  }
  return records.length === BATCH_SIZE;
};

export const drainQuotes: DrainStep = async (ctx, profileId) => {
  const quotes = await ctx.db
    .query("daily_quotes")
    .withIndex("by_profile_date", (q) => q.eq("emotionalProfileId", profileId))
    .take(BATCH_SIZE);
  // Same parity as dataWipe: the vector dies with the row (ADR 0007), and
  // only a replied row ever had a key.
  await purgeReplyEntries(
    ctx,
    profileId,
    quotes.filter((q) => q.reply !== undefined).map((q) => q._id),
  );
  for (const quote of quotes) await ctx.db.delete("daily_quotes", quote._id);
  return quotes.length === BATCH_SIZE;
};

export const drainWaitlist: DrainStep = async (ctx, profileId) => {
  const rows = await ctx.db
    .query("insight_waitlist")
    .withIndex("by_profile_feature", (q) =>
      q.eq("emotionalProfileId", profileId)
    )
    .take(BATCH_SIZE);
  for (const row of rows) await ctx.db.delete("insight_waitlist", row._id);
  return rows.length === BATCH_SIZE;
};


/** Private Library rows; public totals stay up (ADR 0016). */
export const drainLibraryReads: DrainStep = async (ctx, profileId) => {
  const reads = await ctx.db
    .query("library_reads")
    .withIndex("by_emotionalProfileId_and_entryId", (q) => q.eq("emotionalProfileId", profileId))
    .take(BATCH_SIZE);
  for (const r of reads) await ctx.db.delete("library_reads", r._id);
  return reads.length === BATCH_SIZE;
};

export const drainActivityLog: DrainStep = async (ctx, profileId) => {
  const rows = await ctx.db
    .query("activity_log")
    .withIndex("by_emotionalProfileId_and_dayKey_and_actionType", (q) => q.eq("emotionalProfileId", profileId))
    .take(BATCH_SIZE);
  for (const r of rows) await ctx.db.delete("activity_log", r._id);
  return rows.length === BATCH_SIZE;
};

export const drainFrozenDays: DrainStep = async (ctx, profileId) => {
  const rows = await ctx.db
    .query("frozen_days")
    .withIndex("by_emotionalProfileId_and_dayKey", (q) => q.eq("emotionalProfileId", profileId))
    .take(BATCH_SIZE);
  for (const r of rows) await ctx.db.delete("frozen_days", r._id);
  return rows.length === BATCH_SIZE;
};

/** Compounding stretches (ADR 0020): every row, open or closed. */
export const drainStretches: DrainStep = async (ctx, profileId) => {
  const rows = await ctx.db
    .query("compounding_stretches")
    .withIndex("by_emotionalProfileId_and_endedAt", (q) => q.eq("emotionalProfileId", profileId))
    .take(BATCH_SIZE);
  for (const r of rows) await ctx.db.delete("compounding_stretches", r._id);
  return rows.length === BATCH_SIZE;
};

/** Steadiness insights (#525): every row. */
export const drainInsights: DrainStep = async (ctx, profileId) => {
  const rows = await ctx.db
    .query("steadiness_insights")
    .withIndex("by_emotionalProfileId_and_oldestCitedAt", (q) => q.eq("emotionalProfileId", profileId))
    .take(BATCH_SIZE);
  for (const r of rows) await ctx.db.delete("steadiness_insights", r._id);
  return rows.length === BATCH_SIZE;
};
