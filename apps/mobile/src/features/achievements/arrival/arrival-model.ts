/**
 * What arrives, from what the server says is unseen: pure. The backfill
 * summary goes first; then live badges, led by a streak milestone when one of
 * them is a milestone rung.
 */
import type { api } from "@xolace/backend/api";
import type { Id } from "@xolace/backend/dataModel";
import type { FunctionReturnType } from "convex/server";
import {
	type Art,
	artOf,
	type Family,
	familyOfId,
} from "@/features/achievements/achievements-model";
import { COPY } from "@/features/achievements/copy";
import { isHeldRoute } from "@/lib/held-routes";
import { getStreakCopy } from "@/lib/streak-copy";

export type UnseenBadge = FunctionReturnType<
	typeof api.achievements.unlock.unseen
>[number];
export type BackfillSummary = NonNullable<
	FunctionReturnType<typeof api.achievements.firstSight.summary>
>;
type RowId = Id<"user_achievements">;

/** One badge as the arrival shows it. */
export type ArrivingBadge = {
	id: string;
	title: string;
	copy: string;
	sparks: number;
	art: Art;
	family: Family;
};

/** The streak milestone that leads the badges (arrivals §3). */
export type Milestone = {
	day: number;
	/** Yesterday's count, which rolls over to `day`. */
	from: number;
	line: string;
	/**
	 * What the milestone added: its streak saver, or none because one is held.
	 * Null until the server says (an additive field on `unlock.unseen`): the
	 * card shows only what's known, never a guess.
	 */
	freeze: "earned" | "capped" | null;
	/**
	 * The seven days ending on the day the rung was earned, every one showed up.
	 * Null until the server dates the rung and says which days a freeze covered:
	 * a rung can arrive days late, and a covered day isn't one showed up.
	 */
	week: readonly string[] | null;
};

export type ArrivalPlan =
	| {
			kind: "backfill";
			ids: RowId[];
			firstSight: boolean;
			badges: number;
			sparks: number;
			thumbnails: { id: string; art: Art }[];
	  }
	| {
			kind: "badges";
			ids: RowId[];
			badges: ArrivingBadge[];
			milestone: Milestone | null;
	  };

/**
 * Production's streak milestones (`streaks/milestones.ts`: 7, 30, 100, then
 * every 100), mirrored: that module is server-only. Each earns a streak saver.
 */
const MILESTONES = [7, 30, 100] as const;
const MILESTONE_EVERY = 100;
const LAST_MILESTONE = 100;
const STREAK_ID = /^streak-(\d+)$/;
const WEEK = 7;
const DAY_MS = 86_400_000;
const LETTERS = 2;

export function isStreakMilestone(day: number): boolean {
	return (
		(MILESTONES as readonly number[]).includes(day) ||
		(day > LAST_MILESTONE && day % MILESTONE_EVERY === 0)
	);
}

/** The milestone day a badge marks (`streak-7` → 7), or null. */
export function milestoneDayOf(achievementId: string): number | null {
	const match = STREAK_ID.exec(achievementId);
	const day = match ? Number(match[1]) : Number.NaN;
	return isStreakMilestone(day) ? day : null;
}

/** "Tu We Th Fr Sa Su Mo": seven days' letters, ending on `last`. */
export function lastSevenDays(last: Date, locale?: string): string[] {
	return Array.from({ length: WEEK }, (_, i) =>
		new Date(last.getTime() - (WEEK - 1 - i) * DAY_MS)
			.toLocaleDateString(locale, { weekday: "short" })
			.slice(0, LETTERS)
	);
}

const arrivingBadge = (b: UnseenBadge): ArrivingBadge => ({
	art: artOf(b.art),
	copy: b.copy,
	family: familyOfId(b.achievementId),
	id: b.achievementId,
	sparks: b.sparks,
	title: b.title,
});

/**
 * What to show next, leaving out rows already handed to an arrival this run
 * (`opened`): the backfill summary first, then the live badges. A milestone
 * rung leads, with the milestone before it. Null when nothing is due.
 */
export function arrivalPlan({
	unseen,
	summary,
	opened,
}: {
	unseen: readonly UnseenBadge[];
	summary: BackfillSummary | null;
	opened: ReadonlySet<string>;
}): ArrivalPlan | null {
	if (summary?.ids.some((id) => !opened.has(id))) {
		return {
			badges: summary.badges,
			firstSight: summary.firstSight,
			ids: summary.ids,
			kind: "backfill",
			sparks: summary.sparks,
			thumbnails: summary.thumbnails.map((t) => ({
				art: artOf(t.art),
				id: t.achievementId,
			})),
		};
	}
	const fresh = unseen.filter((b) => !opened.has(b.id));
	if (fresh.length === 0) {
		return null;
	}
	const lead = fresh.find((b) => milestoneDayOf(b.achievementId) !== null);
	const ordered = lead ? [lead, ...fresh.filter((b) => b !== lead)] : fresh;
	const day = lead ? milestoneDayOf(lead.achievementId) : null;
	return {
		badges: ordered.map(arrivingBadge),
		ids: ordered.map((b) => b.id),
		kind: "badges",
		milestone:
			day === null
				? null
				: {
						day,
						freeze: null,
						from: day - 1,
						line: getStreakCopy(day) ?? lead?.copy ?? "",
						week: null,
					},
	};
}

/** The milestone's one VoiceOver element. */
export function milestoneLabel(m: Milestone): string {
	return COPY.milestone.label(
		m.day,
		m.line,
		m.freeze ? COPY.milestone[m.freeze].title : null
	);
}

type Where = {
	/** expo-router's pathname (groups stripped). */
	pathname: string;
	/** Home (Today, the landing) has a sheet on screen or the streak reveal, or Reflect has a
	 * session or reflection in progress or the first-run tour. */
	homeBusy: boolean;
	/** A natively presented screen (a form or page sheet, a modal) is up: the overlay would play behind it. */
	presented: boolean;
};

/** Where an arrival waits on `homeBusy`: home, and Reflect, which was home until S2. */
const HOME_ROUTES: ReadonlySet<string> = new Set(["/today", "/reflect"]);

/**
 * An arrival waits its turn on a held screen (`held-routes.ts`) and on a busy
 * home or Reflect; it opens once the user is somewhere else (#693).
 */
export function mayArrive({ homeBusy, pathname, presented }: Where): boolean {
	if (presented) {
		return false;
	}
	if (HOME_ROUTES.has(pathname)) {
		return !homeBusy;
	}
	return !isHeldRoute(pathname);
}
