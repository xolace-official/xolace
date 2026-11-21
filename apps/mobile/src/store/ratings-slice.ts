export type ReleaseRan = { id: string; at: number };

export type RatingsRecord = {
	seen: string[] | null;
	firstRan: ReleaseRan | null;
	lightSession: boolean;
	firstAsked: boolean;
	shownAt: number | null;
	ratedAt: number | null;
	wroteAt: number | null;
	noteAt: number | null;
	heavyAt: number | null;
	heavierFollowUp: boolean;
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

export const ratingsPersistedKeys = (s: RatingsSlice) => ({
	ratings: s.ratings,
});
