import type { api } from "@xolace/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { chatLimitError } from "@/features/xolacer-chat/utils";

type AgeStatus = FunctionReturnType<
	typeof api.age.declarations.status
>["status"];

/** What stands between a seeker and a Xolacer request (#716): the date-of-birth question, or
 * where its answer leads. `declined` is "Prefer not to say", which only the client knows. */
export type AgeGateStep = "ask" | "declined" | "not_available" | "under_13";

/** Bump when the date-of-birth step's wording changes; the server records it with each answer. */
export const AGE_PROMPT_VERSION = "xolacer_chat.v1";

/** The step a status needs before a request, or null when nothing stands in the way. While the
 * status loads the request goes ahead: the server gate answers with `stepForError`'s codes. */
export function stepForStatus(
	status: AgeStatus | undefined
): AgeGateStep | null {
	switch (status) {
		case "unknown":
			return "ask";
		case "13_17":
			return "not_available";
		case "under_13":
			return "under_13";
		default:
			return null;
	}
}

/** The step a refused request needs, from the server's `age_required` / `age_restricted`. */
export function stepForError(error: unknown): AgeGateStep | null {
	const data = chatLimitError(error);
	if (data?.code === "age_required") {
		return "ask";
	}
	if (data?.code === "age_restricted") {
		return data.status === "under_13" ? "under_13" : "not_available";
	}
	return null;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** The picked day as "YYYY-MM-DD" on the device's calendar. A date of birth has no timezone, so
 * never `toISOString()`, which would shift it a day for anyone east of UTC. */
export function calendarDate(date: Date): string {
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
