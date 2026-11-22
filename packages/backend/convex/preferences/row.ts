import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/** The profile's one `preferences` row, or null before onboarding wrote it. */
export function preferencesRow(
	ctx: QueryCtx | MutationCtx,
	emotionalProfileId: Id<"emotional_profiles">
): Promise<Doc<"preferences"> | null> {
	return ctx.db
		.query("preferences")
		.withIndex("by_profile", (q) =>
			q.eq("emotionalProfileId", emotionalProfileId)
		)
		.unique();
}

/** `preferencesRow` for a write: there's nothing to patch without the row. */
export async function requirePreferencesRow(
	ctx: MutationCtx,
	emotionalProfileId: Id<"emotional_profiles">
): Promise<Doc<"preferences">> {
	const row = await preferencesRow(ctx, emotionalProfileId);
	if (!row) {
		throw new Error("Preferences not found");
	}
	return row;
}
