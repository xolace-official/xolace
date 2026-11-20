import type { api } from "@xolace/backend/api";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import { convexErrorCode } from "@/lib/convex-error-code";
import type { LetterFor } from "./copy";
import type { LettersStatus } from "./letters-model";

type ServerStatus = FunctionReturnType<typeof api.letters.status.get>;
type LetterAim = NonNullable<FunctionArgs<typeof api.letters.send.send>["aim"]>;

export type LateRisk = NonNullable<ServerStatus["lateRisk"]>;

export function localDay(now: Date): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * The server's status as the screens read it. Convex doesn't re-run a query when the clock
 * passes midnight, so `today` is lifted once the device's day differs from the day of the last
 * letter. What it lifts to isn't known without the Sent list: Write opens, and a third waiting
 * letter is answered by the send (`limit: three`).
 */
export function statusFrom(s: ServerStatus, today: string): LettersStatus {
	const stale = s.writeLimit === "today" && s.lastSentDay !== today;
	return {
		invite: s.invite,
		optIn: s.optIn,
		unopenedId: s.unopenedId,
		writeLimit: stale ? null : s.writeLimit,
	};
}

const AIMS: Record<LetterFor, LetterAim | undefined> = {
	Anxiety: "anxiety",
	Anyone: undefined,
	Grief: "grief",
	Loneliness: "loneliness",
	"Low days": "low",
	Sleep: "sleep",
};
export const aimOf = (forWho: LetterFor): LetterAim | undefined => AIMS[forWho];

export const isAgeRefusal = (error: unknown): boolean => {
	const code = convexErrorCode(error);
	return code === "age_required" || code === "age_restricted";
};

export const isNoSession = (error: unknown): boolean =>
	convexErrorCode(error) === "no_session";

export const isLetterGone = (error: unknown): boolean =>
	convexErrorCode(error) === "letter_not_found";

export const lateCareDue = ({
	risk,
	armed,
	covered,
	showing,
}: {
	risk: LateRisk | null | undefined;
	armed: boolean;
	covered: boolean;
	showing: LateRisk | null;
}): LateRisk | null =>
	showing === null && armed && !covered && risk ? risk : null;
