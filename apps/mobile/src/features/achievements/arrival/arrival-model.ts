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

export type ArrivingBadge = {
	id: string;
	title: string;
	copy: string;
	sparks: number;
	art: Art;
	family: Family;
};

export type Milestone = {
	day: number;
	from: number;
	line: string;
	freeze: "earned" | "capped" | null;
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

export function milestoneDayOf(achievementId: string): number | null {
	const match = STREAK_ID.exec(achievementId);
	const day = match ? Number(match[1]) : Number.NaN;
	return isStreakMilestone(day) ? day : null;
}

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

export function milestoneLabel(m: Milestone): string {
	return COPY.milestone.label(
		m.day,
		m.line,
		m.freeze ? COPY.milestone[m.freeze].title : null
	);
}

type Where = {
	pathname: string;
	homeBusy: boolean;
	presented: boolean;
};

const HOME_ROUTES: ReadonlySet<string> = new Set(["/today", "/reflect"]);

export function mayArrive({ homeBusy, pathname, presented }: Where): boolean {
	if (presented) {
		return false;
	}
	if (HOME_ROUTES.has(pathname)) {
		return !homeBusy;
	}
	return !isHeldRoute(pathname);
}
