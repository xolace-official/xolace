import type { api } from "@xolace/backend/api";
import type { FunctionReturnType } from "convex/server";

type Today = FunctionReturnType<typeof api.dailyQuotes.getToday>;

export function wordLine(today: Today | undefined): string | null | undefined {
	if (today === undefined) {
		return;
	}
	return today.curated?.text ?? today.session?.text ?? null;
}
