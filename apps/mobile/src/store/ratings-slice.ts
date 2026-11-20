/** What's New and the rating screen's memory on this device (P/design/boards/RatingsRules.dc.html):
 * what was shown, asked and answered, and the signals that make it wait. Persisted, so a
 * cooldown, the last release seen and a rating survive a restart. Times are epoch ms. The rules
 * that read it live in `features/ratings/ratings-model.ts`; whether a follow-up card still waits is
 * server truth (`users.getFullContext`) and isn't kept here. */

/** A release, and when this device first ran a build carrying its notes (`@/lib/release-notes`):
 * the moment that stands in for its release date, so nobody has to set one. */
export type ReleaseRan = { id: string; at: number };

export type RatingsRecord = {
	/** What's New releases already shown. Null until the first plain open sets the baseline: a
	 * person new since the release has nothing to catch up on. */
	seen: string[] | null;
	/** The newest release this device has run, and since when. Noted at every launch, before
	 * sign-in, so an account made after it reads as new to this release. */
	firstRan: ReleaseRan | null;
	/** A finished session that didn't end heavier: the first ask may follow. */
	lightSession: boolean;
	/** The first ask has happened (shown once, ever). */
	firstAsked: boolean;
	/** When the rating screen last showed. */
	shownAt: number | null;
	/** Rate pressed: the store's prompt was asked for (neither store says whether they rated). */
	ratedAt: number | null;
	/** Write a review pressed. */
	wroteAt: number | null;
	/** A note sent through Tell us. */
	noteAt: number | null;
	/** A "much heavier" session end (step ≤ −4), or a check-in answered "Got heavier". */
	heavyAt: number | null;
	/** A session ended heavy enough to ask a follow-up (step ≤ −3) and its check-in isn't
	 * answered yet. Open only while the server still has a card waiting. */
	heavierFollowUp: boolean;
	/** Get help now was opened. */
	helpAt: number | null;
};

export const RATINGS_FRESH: RatingsRecord = {
	firstAsked: false,
	firstRan: null,
	heavierFollowUp: false,
	heavyAt: null,
	helpAt: null,
	lightSession: false,
	noteAt: null,
	ratedAt: null,
	seen: null,
	shownAt: null,
	wroteAt: null,
};

/** What another feature tells the rating rules, so none of them has to know the rules:
 * - `light-session`: a session ended and its mood saved lighter or the same;
 * - `heavier-follow-up`: a session ended heavy enough to ask a follow-up (step ≤ −3);
 * - `much-heavier`: a session ended much heavier (step ≤ −4);
 * - `check-in`, `check-in-heavier`: a check-in was answered (the second, "Got heavier");
 * - `help`: Get help now was opened. */
export type RatingsSignal =
	| "light-session"
	| "heavier-follow-up"
	| "much-heavier"
	| "check-in"
	| "check-in-heavier"
	| "help";

export type RatingsSlice = {
	ratings: RatingsRecord;
	setRatings: (patch: Partial<RatingsRecord>) => void;
	noteRatingsSignal: (signal: RatingsSignal) => void;
	/** At launch: the release this build carries. Keeps the first moment it ran here. */
	noteReleaseRan: (id: string) => void;
};

type SetState = (partial: (s: RatingsSlice) => Partial<RatingsSlice>) => void;

const SIGNAL_PATCH: Record<
	RatingsSignal,
	(now: number) => Partial<RatingsRecord>
> = {
	"check-in": () => ({ heavierFollowUp: false }),
	"check-in-heavier": (now) => ({ heavierFollowUp: false, heavyAt: now }),
	"heavier-follow-up": () => ({ heavierFollowUp: true }),
	help: (now) => ({ helpAt: now }),
	"light-session": () => ({ lightSession: true }),
	"much-heavier": (now) => ({ heavyAt: now }),
};

/** A record saved by an older build may lack a field added since: fill it from the defaults. */
export const ratingsOf = (s: Pick<RatingsSlice, "ratings">): RatingsRecord => ({
	...RATINGS_FRESH,
	...s.ratings,
});

export const createRatingsSlice = (set: SetState): RatingsSlice => ({
	noteRatingsSignal: (signal) =>
		set((s) => ({
			ratings: { ...ratingsOf(s), ...SIGNAL_PATCH[signal](Date.now()) },
		})),
	noteReleaseRan: (id) =>
		set((s) => {
			const r = ratingsOf(s);
			return r.firstRan?.id === id
				? {}
				: { ratings: { ...r, firstRan: { at: Date.now(), id } } };
		}),
	ratings: RATINGS_FRESH,
	setRatings: (patch) =>
		set((s) => ({ ratings: { ...ratingsOf(s), ...patch } })),
});

/** Keys persisted by the app store's `partialize`. */
export const ratingsPersistedKeys = (s: RatingsSlice) => ({
	ratings: s.ratings,
});
