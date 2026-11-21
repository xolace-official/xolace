import { ERROR_CODES } from "@xolace/backend/shared";
import { convexErrorCode } from "@/lib/convex-error-code";
import type { RatingsRecord, ReleaseRan } from "@/store/ratings-slice";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const RATING_RULES = {
	heavyMs: 48 * HOUR,
	helpMs: 7 * DAY,
	openSettleMs: 700,
	ratedMs: 365 * DAY,
	shownMs: 90 * DAY,
} as const;

export type OpenPlan = { whatsNew: boolean; rate: boolean; why: string };

export type OpenInput = {
	record: RatingsRecord;
	cardWaiting: boolean;
	firstRun: boolean;
	release: ReleaseRan;
	now: number;
};

const within = (at: number | null, ms: number, now: number) =>
	at !== null && now - at < ms;

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

function cooling({ record: r, release, now }: OpenInput): string | null {
	if (
		within(r.ratedAt, RATING_RULES.ratedMs, now) ||
		within(r.wroteAt, RATING_RULES.ratedMs, now)
	) {
		return "rated or wrote a review in the last 12 months";
	}
	if (r.noteAt !== null && r.noteAt >= release.at) {
		return "sent a note since the last release";
	}
	if (within(r.shownAt, RATING_RULES.shownMs, now)) {
		return "saw it in the last 90 days";
	}
	return null;
}

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

export function withBaseline(
	record: RatingsRecord,
	accountCreatedAt: number,
	release: ReleaseRan
): RatingsRecord {
	if (record.seen !== null) {
		return record;
	}
	const isNew = accountCreatedAt >= release.at;
	return { ...record, seen: isNew ? [release.id] : [] };
}

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

const DEV_CLIENT = "expo-development-client";

export const isLink = (url: string | null | undefined): boolean =>
	!!url && !url.includes(DEV_CLIENT);

export type OpenMoment = {
	pathname: string;
	linked: boolean;
	blocked: boolean;
};

const TODAY = "/today";

export const isPlainOpen = ({
	pathname,
	linked,
	blocked,
}: OpenMoment): boolean => pathname === TODAY && !linked && !blocked;

export const isHelpRoute = (pathname: string): boolean =>
	pathname === "/crisis-resources" || pathname.startsWith("/crisis-resources/");

export const canSend = (text: string): boolean => text.trim() !== "";

export const sendRefusedAsLimited = (
	error: unknown,
	canSubmit: boolean | undefined
): boolean =>
	canSubmit === false || convexErrorCode(error) === ERROR_CODES.rateLimited;

export const markSeen = (seen: string[] | null, releaseId: string): string[] =>
	seen?.includes(releaseId) ? seen : [...(seen ?? []), releaseId];
