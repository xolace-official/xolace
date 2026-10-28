import type { QuietReturnTier } from "@/features/reflect/quiet-return-copy";
import type { UserVariant } from "@/features/reflect/types";

type ProfileFields = {
	sessionCount: number;
	lastSessionAt?: number;
	firstSessionAt?: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** `streak` is getFullContext's freeze-aware streak (#434), 0 once lapsed; never recompute
 * expiry from lastSessionAt here. */
export function computeUserVariant(
	profile: ProfileFields,
	streak: number
): UserVariant {
	// A first-timer can hold a live streak from non-reflect days; still first-time.
	if (profile.sessionCount === 0) {
		return { kind: "first-time" };
	}

	if (streak === 0) {
		return { kind: "returning" };
	}

	return { kind: "active" };
}

/** Quiet Return tier from the gap since last visit, or the first-session anniversary (which
 * wins). Null when none applies. */
export function computeQuietReturn(
	profile: ProfileFields,
	now: number = Date.now()
): QuietReturnTier | null {
	if (profile.sessionCount === 0 || !profile.lastSessionAt) {
		return null;
	}

	if (profile.firstSessionAt) {
		const anniversaryDays = Math.floor((now - profile.firstSessionAt) / DAY_MS);
		if (anniversaryDays >= 360 && anniversaryDays <= 380) {
			return "anniversary";
		}
	}

	const gapDays = Math.floor((now - profile.lastSessionAt) / DAY_MS);

	if (gapDays >= 90) {
		return "away-90-plus";
	}
	if (gapDays >= 30) {
		return "away-30-90";
	}
	if (gapDays >= 14) {
		return "away-14-30";
	}
	return null;
}
