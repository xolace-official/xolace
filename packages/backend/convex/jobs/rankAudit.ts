import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { reflectionRank } from "../lib/aggregates";

/**
 * Drift detector for the `reflectionRank` aggregate.
 *
 * The sync helpers in `lib/aggregates.ts` deliberately use tolerant writes, so
 * a missed sync never throws — it silently drifts. This audit is the exception
 * we traded away: it compares the table against the tree and shouts in the
 * logs when they disagree.
 *
 * Two paired counts, both computed in this single transaction (so a session
 * completing mid-audit can't produce a false positive):
 *   - total rows        vs unbounded tree count  → catches missing/orphaned entries
 *   - rows with count≥1 vs tree count at key≥1   → catches wrong-key drift across
 *     the population boundary, the only key drift that changes percentiles
 *
 * Detection only — never repairs. On drift: re-run the idempotent backfill
 * (`migrations:backfillReflectionRank`) for missing entries, or clear + rebuild
 * the aggregate if counts are badly wrong (expected once on dev, which has
 * key-0 orphans from pre-fix devTools.setStreak runs).
 *
 * Runs weekly via crons.ts; run manually after a backfill with:
 *   bunx convex run jobs/rankAudit:audit
 */

// Single-transaction scan keeps the audit consistent but bounds it. Well above
// the current profile count; if we ever hit it, the audit refuses to guess and
// asks to be rewritten as a batched scan with drift tolerance.
const SCAN_CAP = 5000;

export const audit = internalMutation({
  args: {},
  returns: v.object({
    status: v.union(v.literal("ok"), v.literal("drift"), v.literal("saturated")),
    tableTotal: v.number(),
    treeTotal: v.number(),
    tableReflectors: v.number(),
    treeReflectors: v.number(),
  }),
  handler: async (ctx) => {
    const rows = await ctx.db.query("emotional_profiles").take(SCAN_CAP);

    const tableTotal = rows.length;
    const tableReflectors = rows.filter((r) => r.sessionCount >= 1).length;
    const treeTotal = await reflectionRank.count(ctx);
    const treeReflectors = await reflectionRank.count(ctx, {
      bounds: { lower: { key: 1, inclusive: true } },
    });

    const counts = { tableTotal, treeTotal, tableReflectors, treeReflectors };

    if (rows.length === SCAN_CAP) {
      console.error(
        "[rankAudit] emotional_profiles exceeds SCAN_CAP — audit is blind past the cap. " +
          "Rewrite as a batched scan before trusting these numbers.",
        counts,
      );
      return { status: "saturated" as const, ...counts };
    }

    if (tableTotal !== treeTotal || tableReflectors !== treeReflectors) {
      console.error(
        "[rankAudit] DRIFT: reflectionRank aggregate disagrees with emotional_profiles. " +
          "Percentiles are wrong for someone. Repair: migrations:backfillReflectionRank " +
          "(missing entries) or clear + rebuild (orphans/wrong keys).",
        counts,
      );
      return { status: "drift" as const, ...counts };
    }

    console.log("[rankAudit] ok — aggregate matches table.", counts);
    return { status: "ok" as const, ...counts };
  },
});
