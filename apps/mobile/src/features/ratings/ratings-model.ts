import type { RatingsRecord } from "@/store/ratings-slice";
import type { WhatsNewEntry } from "./copy";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** When it shows (RatingsRules): every wait in one place. */
export const RATING_RULES = {
	/** A "much heavier" session end or a "Got heavier" check-in: wait 48 h. */
	heavyMs: 48 * HOUR,
	/** Used Help: wait 7 days. */
	helpMs: 7 * DAY,
	/** A plain open settles this long before anything shows, so a link or a push lands first. */
	openSettleMs: 700,
	/** Rated or wrote a review: no ask for a year. */
	ratedMs: 365 * DAY,
	/** Saw the rating screen: not again for 90 days. */
	shownMs: 90 * DAY,
} as const;

/** What a plain open shows: What's New (then maybe the rating screen), the rating screen, or nothing. */
export type OpenPlan = { whatsNew: boolean; rate: boolean; why: string };

export type OpenInput = {
	record: RatingsRecord;
	/** A follow-up card still waits on them (`getFullContext().hasPendingFollowUp`). */
	cardWaiting: boolean;
	/** This open came through first run (sign-in, intake): nothing shows. */
	firstRun: boolean;
	release: Pick<WhatsNewEntry, "id" | "shippedAt">;
	now: number;
};

const within = (at: number | null, ms: number, now: number) =>
	at !== null && now - at < ms;

/** Wait while they're hurting: a much heavier session or check-in, an open heavier follow-up, or Help. */
function hurting({ record: r, cardWaiting, now }: OpenInput): string | null {
	if (within(r.heavyAt, RATING_RULES.heavyMs, now)) {
		return "much heavier, or a heavier check-in, in the last 48 h";
	}
	if (r.heavierFollowUp && cardWaiting) {
		return "a heavier follow-up is still open";
	}
	if (within(r.helpAt, RATING_RULES.helpMs, now)) {
		return "used Help in the last 7 days";
	}
	return null;
}

/** The release's own cooldowns: rated or wrote in 12 months, a note since the release, shown in 90 days. */
function cooling({ record: r, release, now }: OpenInput): string | null {
	if (
		within(r.ratedAt, RATING_RULES.ratedMs, now) ||
		within(r.wroteAt, RATING_RULES.ratedMs, now)
	) {
		return "rated or wrote a review in the last 12 months";
	}
	if (r.noteAt !== null && r.noteAt >= Date.parse(release.shippedAt)) {
		return "sent a note since the last release";
	}
	if (within(r.shownAt, RATING_RULES.shownMs, now)) {
		return "saw it in the last 90 days";
	}
	return null;
}

/**
 * RatingsRules: the first ask comes on the next plain open after a finished session that didn't
 * end heavier; a release with a What's New shows it to anyone who hasn't seen it, then the rating
 * screen unless a cooldown holds. Either way the rating screen waits while they're hurting.
 * `record.seen` must be settled (`withBaseline`) first.
 */
export function planOpen(input: OpenInput): OpenPlan {
	const { record: r, release } = input;
	if (input.firstRun) {
		return { rate: false, whatsNew: false, why: "first run comes first" };
	}
	const why = hurting(input) ?? cooling(input);
	if (!(r.seen ?? []).includes(release.id)) {
		return {
			rate: why === null,
			whatsNew: true,
			why: why
				? `What's New only: ${why}`
				: "What's New, then the rating screen",
		};
	}
	if (r.lightSession && !r.firstAsked) {
		return {
			rate: why === null,
			whatsNew: false,
			why: why ? `Nothing: ${why}` : "The first ask",
		};
	}
	return {
		rate: false,
		whatsNew: false,
		why: r.firstAsked
			? "Nothing until the next release"
			: "Nothing: no finished lighter session yet",
	};
}

/**
 * The first plain open on a device settles which releases count as seen: an account made after
 * the release has never known Xolace without it, so its What's New is nothing new.
 */
export function withBaseline(
	record: RatingsRecord,
	accountCreatedAt: number,
	release: Pick<WhatsNewEntry, "id" | "shippedAt">
): RatingsRecord {
	if (record.seen !== null) {
		return record;
	}
	const isNew = accountCreatedAt >= Date.parse(release.shippedAt);
	return { ...record, seen: isNew ? [release.id] : [] };
}

/** What showing a plan writes: the release as seen, and the ask as shown. */
export function afterShowing(
	record: RatingsRecord,
	plan: OpenPlan,
	releaseId: string,
	now: number
): Partial<RatingsRecord> {
	const seen = markSeen(record.seen, releaseId);
	return {
		...(plan.whatsNew && seen !== record.seen ? { seen } : {}),
		...(plan.rate ? { firstAsked: true, shownAt: now } : {}),
	};
}

/** The dev client opens the app through its own link; that isn't someone following a link. */
const DEV_CLIENT = "expo-development-client";

/** A launch or a visit that came through a link (a deep link, a dev state), not a plain open. */
export const isLink = (url: string | null | undefined): boolean =>
	!!url && !url.includes(DEV_CLIENT);

export type OpenMoment = {
	/** The screen in front now. */
	pathname: string;
	/** Came through a link or a notification tap. */
	linked: boolean;
	/** Something else is about to greet or is up (Coming back's greeting, a home sheet). */
	blocked: boolean;
};

/** Where a plain open lands: a follow-up, Talk or Help would be in front instead. */
const TODAY = "/today";

/** A plain open: Today in front, not through a link or a push, nothing else greeting. */
export const isPlainOpen = ({
	pathname,
	linked,
	blocked,
}: OpenMoment): boolean => pathname === TODAY && !linked && !blocked;

/** The crisis help route: opening it starts Help's 7-day wait. */
export const isHelpRoute = (pathname: string): boolean =>
	pathname === "/crisis-resources" || pathname.startsWith("/crisis-resources/");

/** `feedback.submit`'s limit for a general note. */
export const TELL_US_MAX = 1000;

/** Send needs words. */
export const canSend = (text: string): boolean => text.trim() !== "";

/** `seen` with this release in it (the same array when it already is). */
export const markSeen = (seen: string[] | null, releaseId: string): string[] =>
	seen?.includes(releaseId) ? seen : [...(seen ?? []), releaseId];
