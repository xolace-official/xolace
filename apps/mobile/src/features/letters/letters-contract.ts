/**
 * Letters' contract (`docs/plan/letters.md` §4, §13) in the shapes the screens already use.
 * Pure: the seam (`use-letters-data.ts`) calls these, so the screens never see the server's
 * shapes and every mapping is tested here.
 */
import type { api } from "@xolace/backend/api";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import { convexErrorCode } from "@/lib/convex-error-code";
import type { LetterFor } from "./copy";
import type { LettersStatus } from "./letters-model";

type ServerStatus = FunctionReturnType<typeof api.letters.status.get>;
type LetterAim = NonNullable<FunctionArgs<typeof api.letters.send.send>["aim"]>;

/** A late re-check found the sender at risk after their letter read as sent (spec §5.4). */
export type LateRisk = NonNullable<ServerStatus["lateRisk"]>;

/** The device's local day, "YYYY-MM-DD": what the server's `lastSentDay` is compared with. */
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

/** The writing screen's "For" as the contract's aim. Anyone sends none. */
const AIMS: Record<LetterFor, LetterAim | undefined> = {
	Anxiety: "anxiety",
	Anyone: undefined,
	Grief: "grief",
	Loneliness: "loneliness",
	"Low days": "low",
	Sleep: "sleep",
};
export const aimOf = (forWho: LetterFor): LetterAim | undefined => AIMS[forWho];

/** The server refused on age: Connect's date-of-birth ask, then try again. */
export const isAgeRefusal = (error: unknown): boolean => {
	const code = convexErrorCode(error);
	return code === "age_required" || code === "age_restricted";
};

/** Send refused before the writer's first finished session. */
export const isNoSession = (error: unknown): boolean =>
	convexErrorCode(error) === "no_session";

/**
 * The letter is gone (reported from another device, or not yours): its row drops by itself,
 * so the call that found it gone has nothing to say.
 */
export const isLetterGone = (error: unknown): boolean =>
	convexErrorCode(error) === "letter_not_found";

/**
 * Whether the care for a late risk shows now. It shows only when the app opens or comes back to
 * the front (`armed`), never over what someone is doing; one already up stays up. It waits while
 * the screen is `covered`: Write (which draws its own care) or a natively presented screen, which
 * a host can't draw over, so the care would be heard without being seen.
 */
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
