/**
 * What Today's kindling card shows (`P/design/handoff/kindling.md` §11.1). The card never
 * leaves Today: a live kindling wins; without one, a free member sees what Xolace+ adds, and
 * a Xolace+ member sees "setting up" while `paths.settingUp.get` names a session and "none
 * right now" otherwise.
 */
export type KindlingEmptyMode = "plus" | "free" | "setting-up";
export type KindlingCardMode = "live" | KindlingEmptyMode;

/**
 * The card's state with no kindling to draw, or undefined while what decides it loads (the
 * card keeps its skeleton). `settingUp` is the server's mark: undefined while it loads (or
 * isn't read, for a free member), null with none. A server-side Xolace+ doesn't wait for
 * RevenueCat (`isLoading` includes its offerings fetch): RevenueCat can only add Xolace+.
 */
export function kindlingEmptyMode(s: {
	isPlus: boolean;
	isLoading: boolean;
	settingUp: object | null | undefined;
}): KindlingEmptyMode | undefined {
	if (s.isLoading && !s.isPlus) {
		return;
	}
	if (!s.isPlus) {
		return "free";
	}
	if (s.settingUp === undefined) {
		return;
	}
	return s.settingUp === null ? "plus" : "setting-up";
}

/**
 * Live whenever there's a kindling, whatever else is set (the server never marks one as
 * setting up while one is active, so the two can't disagree for long); else the empty mode.
 * Undefined while either is still loading.
 */
export function kindlingCardMode(
	kindling: object | null | undefined,
	empty: KindlingEmptyMode | undefined
): KindlingCardMode | undefined {
	if (kindling) {
		return "live";
	}
	return kindling === null ? empty : undefined;
}

/**
 * The mode the card shows: a re-read that loads (free → Xolace+ mid-session, while
 * `settingUp.get` starts) keeps the last one it had, so the card crossfades straight to the
 * next mode. The skeleton is for the first resolve only.
 */
export function heldEmptyMode(
	last: KindlingEmptyMode | undefined,
	next: KindlingEmptyMode | undefined
): KindlingEmptyMode | undefined {
	return next ?? last;
}
