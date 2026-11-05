import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { localDayKey } from "../streaks/activityLog";
import { profileTimezone } from "../streaks/state";
import { type AgeStatus, ageStatusOn } from "./ageStatus";

/** Who an age is read for: the user row holds the declarations, the profile the timezone. */
export type AgeSubject = {
	profile: Doc<"emotional_profiles">;
	user: Doc<"users">;
};

/** The user's latest age declaration, if they've made one. */
export function latestDeclaration(ctx: QueryCtx, userId: Doc<"users">["_id"]) {
	return ctx.db
		.query("age_declarations")
		.withIndex("by_user_declared", (q) => q.eq("userId", userId))
		.order("desc")
		.first();
}

/** Today on the user's own calendar: their notification timezone, else UTC. */
export async function userLocalDay(
	ctx: QueryCtx,
	{ profile }: AgeSubject
): Promise<string> {
	return localDayKey(Date.now(), await profileTimezone(ctx, profile));
}

/**
 * The one age status every gate reads (#716): the latest declared date of
 * birth on the user's local day, `unknown` with none. The v1 intake
 * `ageBracket` is never an input.
 */
export async function effectiveAgeStatus(
	ctx: QueryCtx,
	subject: AgeSubject
): Promise<AgeStatus> {
	const declaration = await latestDeclaration(ctx, subject.user._id);
	return ageStatusOn(
		declaration?.dateOfBirth,
		await userLocalDay(ctx, subject)
	);
}
