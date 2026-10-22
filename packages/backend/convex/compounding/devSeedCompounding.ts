import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalMutation } from "../_generated/server";
import { assertDevToolsEnabled } from "../devTools";
import { domainValidator } from "../lib/validators";
import { loadReadings } from "./readings";
import { computeSteadiness } from "./steadiness";
import { evaluateCompounding } from "./stretches";

const DAY = 86_400_000;

/**
 * Dev-only (#520): a compounding Work on any profile, for the insights screen.
 * A settled usual every other day, a heavy last week, then tonight's session
 * opens the stretch through the real evaluation, and lights an active kindling
 * (one breathing twig) so the detail card's hand-off shows. Tagged
 * `seed-compounding`; run with PREMIUM_DEV_OVERRIDE=true to see it. On a
 * profile whose own Work history outweighs the seed, the evaluation opens
 * nothing; the stretch is then forced, anchored 25 above live steadiness. Adds
 * 58 sessions to the profile and replaces its active kindling: use a test
 * profile, not one whose data you want kept.
 *
 *   bunx convex run compounding/devSeedCompounding:seedCompounding '{"profileId":"…"}'
 */
export const seedCompounding = internalMutation({
  args: { profileId: v.id("emotional_profiles") },
  returns: v.null(),
  handler: async (ctx, { profileId }) => {
    assertDevToolsEnabled();
    const now = Date.now();
    const days = [
      ...Array.from({ length: 50 }, (_, i) => ({ daysAgo: 120 - i * 2, intensity: 4 })),
      ...Array.from({ length: 7 }, (_, i) => ({ daysAgo: 1.5 + i, intensity: 10 })),
      { daysAgo: 0.05, intensity: 10 },
    ];
    let sessionId: Id<"sessions"> | undefined;
    for (const { daysAgo, intensity } of days) {
      const at = now - daysAgo * DAY;
      sessionId = await ctx.db.insert("sessions", {
        emotionalProfileId: profileId,
        state: "completed",
        entryType: "open_prompt",
        confirmationState: "confirmed",
        kept: true,
        createdAt: at,
        updatedAt: at,
      });
      await ctx.db.insert("emotional_metadata", {
        sessionId,
        emotionalProfileId: profileId,
        classifierVersion: "seed-compounding",
        primaryEmotion: "anxiety",
        primaryEmotionConfidence: 0.9,
        intensity,
        specificity: 5,
        thematicTags: ["work"],
        userLanguageTags: [],
        riskFlag: false,
        createdAt: at,
      });
    }
    await evaluateCompounding(ctx, profileId, { sessionId });
    const open = await ctx.db
      .query("compounding_stretches")
      .withIndex("by_emotionalProfileId_and_endedAt", (q) => q.eq("emotionalProfileId", profileId).eq("endedAt", undefined))
      .take(10);
    if (!open.some((s) => s.domain === "work")) {
      const { readings, timezone } = await loadReadings(ctx, profileId);
      const work = computeSteadiness(readings, { now, timezone }).domains.find((d) => d.domain === "work");
      await ctx.db.insert("compounding_stretches", {
        emotionalProfileId: profileId,
        domain: "work",
        startedAt: now,
        anchorBaseline: (work?.raw.steadiness ?? 50) + 25,
      });
    }

    for (const old of await ctx.db
      .query("paths")
      .withIndex("by_profile_and_status", (q) => q.eq("emotionalProfileId", profileId).eq("status", "active"))
      .take(10)) {
      await ctx.db.patch("paths", old._id, { status: "replaced" });
    }
    const pathId = await ctx.db.insert("paths", {
      emotionalProfileId: profileId,
      sessionId: sessionId!, // days is never empty
      status: "active",
      model: "seed-compounding",
      modelVersion: "seed-compounding",
      generatedAt: Date.now(), // after the stretch, as generation runs after completion
    });
    await ctx.db.insert("path_steps", {
      pathId,
      actionType: "breathing",
      order: 1,
      why: "A minute to let the day settle.",
      params: null,
      state: "pending",
    });
    return null;
  },
});

/**
 * Undo seedCompounding: its sessions, any stretch since, its kindling, and
 * `restorePathId` (the kindling it replaced) back to active.
 */
export const unseedCompounding = internalMutation({
  args: { profileId: v.id("emotional_profiles"), restorePathId: v.optional(v.id("paths")) },
  returns: v.number(),
  handler: async (ctx, { profileId, restorePathId }) => {
    assertDevToolsEnabled();
    const seeded = (
      await ctx.db
        .query("emotional_metadata")
        .withIndex("by_profile_emotion", (q) => q.eq("emotionalProfileId", profileId))
        .take(4000)
    ).filter((m) => m.classifierVersion === "seed-compounding");
    for (const m of seeded) {
      await ctx.db.delete("emotional_metadata", m._id);
      await ctx.db.delete("sessions", m.sessionId);
    }
    const since = Math.min(...seeded.map((m) => m.createdAt));
    for (const s of await ctx.db
      .query("compounding_stretches")
      .withIndex("by_emotionalProfileId_and_endedAt", (q) => q.eq("emotionalProfileId", profileId))
      .take(100)) {
      if (s.startedAt >= since) await ctx.db.delete("compounding_stretches", s._id);
    }
    for (const p of await ctx.db
      .query("paths")
      .withIndex("by_profile_and_status", (q) => q.eq("emotionalProfileId", profileId).eq("status", "active"))
      .take(10)) {
      if (p.model !== "seed-compounding") continue;
      for (const step of await ctx.db.query("path_steps").withIndex("by_path", (q) => q.eq("pathId", p._id)).take(10)) {
        await ctx.db.delete("path_steps", step._id);
      }
      await ctx.db.delete("paths", p._id);
    }
    if (restorePathId) await ctx.db.patch("paths", restorePathId, { status: "active" });
    return seeded.length;
  },
});

/**
 * Dev-only (#523): stamp an unlock on the profile's newest completed session
 * (seen cleared), so its session-end screen shows the beat. No domains
 * clears the stamp. Returns the id.
 *
 *   bunx convex run compounding/devSeedCompounding:seedUnlock '{"profileId":"…","domains":["work"],"first":true}'
 */
export const seedUnlock = internalMutation({
  args: { profileId: v.id("emotional_profiles"), domains: v.array(domainValidator), first: v.boolean() },
  returns: v.id("sessions"),
  handler: async (ctx, { profileId, domains, first }) => {
    assertDevToolsEnabled();
    const session = (
      await ctx.db
        .query("sessions")
        .withIndex("by_profile_time", (q) => q.eq("emotionalProfileId", profileId))
        .order("desc")
        .take(20)
    ).find((s) => s.state === "completed");
    if (!session) throw new Error("No completed session to stamp");
    await ctx.db.patch("sessions", session._id, {
      domainUnlock: domains.length > 0 ? { domains, first } : undefined,
    });
    return session._id;
  },
});
