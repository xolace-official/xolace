import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";
import { writeCalibrationInternal } from "../../semanticProfiles";
import { posthog } from "../../posthog";
import {
  computeCalibration,
  deriveCalibrationSignals,
} from "./calibrationSignals";

// =============================================================
// TONE / CALIBRATION ADAPTATION — Cognition Layer Phase 4, Loop #1.
//
// The "what lands" section of the semantic profile, learned per user. This
// is the loop that makes session 50 feel different from session 5 (doc §4.1).
//
// DETERMINISTIC BY DESIGN: calibration is derived in rule-code from the
// longitudinal signal the pipeline already captures — confirmation outcomes,
// mirror lengths, tone tallies, mood deltas. No model call, per the
// constitution rule ("no feature may call an LLM to re-derive something the
// Understanding already knows"). The articulator already READS this section
// via renderSemanticProfile; this module is the missing write side that the
// consolidation prompt reserves ("Leave the 'what lands' section alone. It is
// written by a separate process."). The pure signal logic lives in
// calibrationSignals.ts; this module owns the Convex write path.
//
// Runs on the consolidation cadence (final step of consolidationWorkflow),
// independent of the agent's narrative write, patching calibration in place
// through the sanctioned writeCalibrationInternal path.
// =============================================================

/** Deterministic writer — stamped like the model writers for attribution. */
export const CALIBRATION_VERSION = "calibration-v1-deterministic";

// Bounded scan window; the newest sessions carry the current "what lands".
const SIGNAL_WINDOW = 40;

/**
 * Recompute and commit this person's calibration. Reads a bounded session
 * window, derives the signal, and writes the "what lands" section in place
 * via the sanctioned path. A no-op when evidence is thin or a wipe is in
 * progress. Invoked as the final step of consolidationWorkflow — deterministic
 * and cheap, so it runs every consolidation regardless of the agent's write.
 */
export const refreshCalibration = internalMutation({
  args: { emotionalProfileId: v.id("emotional_profiles") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("sessions")
      .withIndex("by_profile_time", (q) =>
        q.eq("emotionalProfileId", args.emotionalProfileId),
      )
      .order("desc")
      .take(SIGNAL_WINDOW);

    const calibration = computeCalibration(deriveCalibrationSignals(rows));
    if (!calibration) return null;

    const result = await writeCalibrationInternal(ctx, {
      emotionalProfileId: args.emotionalProfileId,
      calibration,
      writerVersion: CALIBRATION_VERSION,
    });

    if (result) {
      await posthog.capture(ctx, {
        distinctId: args.emotionalProfileId,
        event: "reflect_calibration_written",
        properties: { writerVersion: CALIBRATION_VERSION },
      });
    }
    return null;
  },
});
