import type { api } from "@xolace/backend/api";
import type { FunctionReturnType } from "convex/server";

type Today = FunctionReturnType<typeof api.dailyQuotes.getToday>;

/**
 * Today's word from `dailyQuotes.getToday`: the curated line, else the one a session left,
 * else none (null). Undefined while it loads: the card holds its place and shows nothing.
 */
export function wordLine(today: Today | undefined): string | null | undefined {
	if (today === undefined) {
		return;
	}
	return today.curated?.text ?? today.session?.text ?? null;
}
