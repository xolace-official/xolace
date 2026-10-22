import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// =============================================================
// SEMANTIC PROFILES — the AI-written narrative of who this person
// is emotionally (Cognition Layer §1.2).
//
// Append-only versions; emotional_profiles.currentSemanticProfileId
// points at the live one. Written ONLY by the Reflection Agent
// (Phase 3) through createVersion — no other write path is
// sanctioned. Read whole (never vector-searched) by the articulator
// context and, progressively, the insights UI.
// =============================================================

/** Render a profile document as prompt-ready text. Null when empty. */
export function renderSemanticProfile(
  profile: Doc<"semantic_profiles">,
): string | null {
  const sections = [
    profile.recurringThemes && `Recurring themes: ${profile.recurringThemes}`,
    profile.emotionalSignatures &&
      `Emotional signatures: ${profile.emotionalSignatures}`,
    profile.calibration && `What lands: ${profile.calibration}`,
    profile.trajectory && `Recent trajectory: ${profile.trajectory}`,
  ].filter((s): s is string => !!s);
  return sections.length > 0 ? sections.join("\n") : null;
}

/** The current semantic profile version for a user, or null. */
export const getCurrent = internalQuery({
  args: { emotionalProfileId: v.id("emotional_profiles") },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get("emotional_profiles", args.emotionalProfileId);
    if (!profile?.currentSemanticProfileId) return null;
    return await ctx.db.get("semantic_profiles", profile.currentSemanticProfileId);
  },
});

/**
 * Append a new profile version and move the pointer. The sole
 * sanctioned write path — the Reflection Agent's passes call this.
 * Sections not provided are carried forward from the current version
 * so a light pass can update trajectory without erasing the rest.
 */
export const createVersion = internalMutation({
  args: {
    emotionalProfileId: v.id("emotional_profiles"),
    recurringThemes: v.optional(v.string()),
    emotionalSignatures: v.optional(v.string()),
    calibration: v.optional(v.string()),
    trajectory: v.optional(v.string()),
    writerVersion: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"semantic_profiles"> | null> => {
    return await createVersionInternal(ctx, args);
  },
});

/**
 * Shared version-append logic — reused by createVersion (the sanctioned
 * mutation) and updateTrajectory's v1 bootstrap so neither has to call the
 * other through the registered API from inside a mutation.
 */
async function createVersionInternal(
  ctx: MutationCtx,
  args: {
    emotionalProfileId: Id<"emotional_profiles">;
    recurringThemes?: string;
    emotionalSignatures?: string;
    calibration?: string;
    trajectory?: string;
    writerVersion: string;
  },
): Promise<Id<"semantic_profiles"> | null> {
  const profile = await ctx.db.get("emotional_profiles", args.emotionalProfileId);
  if (!profile) throw new Error("Profile not found");

  // Privacy guard: a mid-wipe consolidation must not re-materialize derived
  // PII after the wipe swept the rows. No-op while a wipe is in progress.
  if (profile.dataWipeInProgress === true) return null;

  const current = profile.currentSemanticProfileId
    ? await ctx.db.get("semantic_profiles", profile.currentSemanticProfileId)
    : null;

  const newId = await ctx.db.insert("semantic_profiles", {
    emotionalProfileId: args.emotionalProfileId,
    version: (current?.version ?? 0) + 1,
    recurringThemes: args.recurringThemes ?? current?.recurringThemes,
    emotionalSignatures:
      args.emotionalSignatures ?? current?.emotionalSignatures,
    calibration: args.calibration ?? current?.calibration,
    trajectory: args.trajectory ?? current?.trajectory,
    writerVersion: args.writerVersion,
    createdAt: Date.now(),
  });

  await ctx.db.patch("emotional_profiles", args.emotionalProfileId, {
    currentSemanticProfileId: newId,
    updatedAt: Date.now(),
  });

  return newId;
}

/**
 * Patch the current version's trajectory IN PLACE — no new version. The
 * post-session light pass calls this: trajectory is the fast-moving line, and
 * appending a version per session would make version numbers meaningless for
 * rollback / "confirmation dropped after v14" attribution (those stay = the
 * consolidation snapshots). Falls back to createVersion for the v1 bootstrap
 * when the user has no profile yet. Wipe-guarded like createVersion.
 */
export const updateTrajectory = internalMutation({
  args: {
    emotionalProfileId: v.id("emotional_profiles"),
    trajectory: v.string(),
    writerVersion: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"semantic_profiles"> | null> => {
    const profile = await ctx.db.get("emotional_profiles", args.emotionalProfileId);
    if (!profile) throw new Error("Profile not found");
    if (profile.dataWipeInProgress === true) return null;

    // Bootstrap: no current version yet → mint v1 with just the trajectory.
    if (!profile.currentSemanticProfileId) {
      return await createVersionInternal(ctx, {
        emotionalProfileId: args.emotionalProfileId,
        trajectory: args.trajectory,
        writerVersion: args.writerVersion,
      });
    }

    await ctx.db.patch("semantic_profiles", profile.currentSemanticProfileId, {
      trajectory: args.trajectory,
    });
    await ctx.db.patch("emotional_profiles", args.emotionalProfileId, { updatedAt: Date.now() });
    return profile.currentSemanticProfileId;
  },
});

/**
 * Write the "what lands" / calibration section IN PLACE on the current
 * version — the sanctioned write path for the Phase 4 tone-adaptation loop
 * (Cognition Layer §1.2, §4.1). Deliberately separate from the Reflection
 * Agent's narrative write: calibration is deterministic, statistical, and
 * decoupled from the agent's version-append, so it patches in place (like
 * updateTrajectory) rather than minting a version. That also means it never
 * collides with the agent's single-write model. Falls back to createVersion
 * for the v1 bootstrap. Wipe-guarded. Shared helper so callers in other
 * modules (calibration.ts) don't go through the registered API from a
 * mutation.
 */
export async function writeCalibrationInternal(
  ctx: MutationCtx,
  args: {
    emotionalProfileId: Id<"emotional_profiles">;
    calibration: string;
    writerVersion: string;
  },
): Promise<Id<"semantic_profiles"> | null> {
  const profile = await ctx.db.get("emotional_profiles", args.emotionalProfileId);
  if (!profile) throw new Error("Profile not found");
  if (profile.dataWipeInProgress === true) return null;

  // Bootstrap: no current version yet → mint v1 with just the calibration.
  if (!profile.currentSemanticProfileId) {
    return await createVersionInternal(ctx, {
      emotionalProfileId: args.emotionalProfileId,
      calibration: args.calibration,
      writerVersion: args.writerVersion,
    });
  }

  await ctx.db.patch("semantic_profiles", profile.currentSemanticProfileId, {
    calibration: args.calibration,
  });
  await ctx.db.patch("emotional_profiles", args.emotionalProfileId, { updatedAt: Date.now() });
  return profile.currentSemanticProfileId;
}

/**
 * Roll the pointer back to an earlier version (a bad agent pass
 * corrupts every subsequent mirror — this is the one-step revert).
 * The bad version row is kept for auditability, not deleted.
 */
export const revertToVersion = internalMutation({
  args: {
    emotionalProfileId: v.id("emotional_profiles"),
    version: v.number(),
  },
  handler: async (ctx, args) => {
    const target = await ctx.db
      .query("semantic_profiles")
      .withIndex("by_profile_version", (q) =>
        q
          .eq("emotionalProfileId", args.emotionalProfileId)
          .eq("version", args.version),
      )
      .unique();
    if (!target) throw new Error("Version not found");

    await ctx.db.patch("emotional_profiles", args.emotionalProfileId, {
      currentSemanticProfileId: target._id,
      updatedAt: Date.now(),
    });
    return null;
  },
});
