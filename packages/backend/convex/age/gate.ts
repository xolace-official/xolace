import { ConvexError } from "convex/values";
import type { QueryCtx } from "../_generated/server";
import { type AgeSubject, effectiveAgeStatus } from "./status";

/**
 * What an 18+ gate does with someone who hasn't given a date of birth: `ask`
 * refuses with `age_required` so the client shows the date-of-birth step;
 * `allow` lets them through.
 */
type WhenUnknown = "ask" | "allow";

/**
 * The one helper every 18+ gate calls (#716). A declared minor is always
 * refused with `age_restricted` and their status, so a client can show the
 * right screen.
 */
export async function requireAdult(
	ctx: QueryCtx,
	subject: AgeSubject,
	whenUnknown: WhenUnknown
): Promise<void> {
	const status = await effectiveAgeStatus(ctx, subject);
	if (status === "13_17" || status === "under_13") {
		throw new ConvexError({ code: "age_restricted", status });
	}
	if (status === "unknown" && whenUnknown === "ask") {
		throw new ConvexError({ code: "age_required" });
	}
}

/**
 * How a seeker's Xolacer request treats a missing date of birth, from the
 * `clientVersion` it sent. Only a build with the date-of-birth step sends one.
 */
// DEPRECATED(remove-after: app >= 1.15.0): an old binary (no `clientVersion`)
// has no date-of-birth step, so refusing it would only show an error the user
// can't act on; it passes as before the gate. Return "ask" for everyone once
// 1.15.0 is the minimum supported version.
export function seekerWhenUnknown(
	clientVersion: string | undefined
): WhenUnknown {
	return clientVersion === undefined ? "allow" : "ask";
}
