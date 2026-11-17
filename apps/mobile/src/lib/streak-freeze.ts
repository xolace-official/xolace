/**
 * Why a streak freeze can't be bought, as `achievements/sparks.buyFreeze` decides it. In
 * `src/lib` because two screens sell freezes (Achievements and You's freeze explanation) and
 * features can't import each other; one copy keeps their reasons from drifting apart.
 */

/** The fields of `achievements/display.shelf` the checks read. */
type FreezeShelf = {
	balance: number;
	freezeCap: number;
	freezePrice: number;
	freezes: number;
	streakLapsed: boolean;
};

const plural = (n: number, one: string, many: string) =>
	`${n} ${n === 1 ? one : many}`;

const FREEZE_COPY = {
	capped: (cap: number) => `You're holding the max of ${cap} freezes.`,
	failed: "Couldn't buy a freeze. Try again.",
	lapsed: "Your streak ended. Show up today, then buy one.",
	notEnough: "Not enough sparks for a freeze yet.",
	short: (sparks: number) =>
		`${plural(sparks, "more spark", "more sparks")} to buy one.`,
} as const;

/**
 * Why the buy is off, null when it's on. The checks run in the order the server's run them
 * (`buyFreeze` in `packages/backend/convex/achievements/sparks.ts`): an ended streak, then
 * too few sparks, then the cap. Keep the two in step.
 */
export function freezeReason(shelf: FreezeShelf): string | null {
	if (shelf.streakLapsed) {
		return FREEZE_COPY.lapsed;
	}
	const short = shelf.freezePrice - shelf.balance;
	if (short > 0) {
		return FREEZE_COPY.short(short);
	}
	if (shelf.freezes >= shelf.freezeCap) {
		return FREEZE_COPY.capped(shelf.freezeCap);
	}
	return null;
}

/** What a refused buy says: a race the screen hadn't caught up with, or a failure. */
export function freezeRefusal(code: unknown, freezeCap: number): string {
	switch (code) {
		case "freeze_cap_reached":
			return FREEZE_COPY.capped(freezeCap);
		case "insufficient_sparks":
			return FREEZE_COPY.notEnough;
		case "streak_lapsed":
			return FREEZE_COPY.lapsed;
		default:
			return FREEZE_COPY.failed;
	}
}
