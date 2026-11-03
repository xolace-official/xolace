import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { type QueryCtx, query } from "../_generated/server";
import { requireAuth } from "../lib/auth";
import { FREEZE_SPARK_PRICE } from "../lib/streakFreezes";
import { streakState } from "../streaks/state";
import { type BadgeArt, badgeArt, badgeArtValidator } from "./art";
import {
	ACHIEVEMENT_CATEGORIES,
	type Achievement,
	type AchievementCategory,
	FIXED_ACHIEVEMENTS,
	findAchievement,
	type GoalCounter,
	nextStreakRungAfter,
	streakAchievementsThrough,
} from "./catalog";

/**
 * What the achievements screen and badge detail page show (#692). The server
 * sends every title, copy line and art URL, so the app bundles no catalog and
 * new badges reach old builds without a release.
 */

/** Far above the catalog's ~60 rungs a profile can have earned. */
const EARNED_LIMIT = 500;
/** The streak row always reaches the first year, then one rung past the user's best. */
const STREAK_SHOWN_THROUGH = 365;
/** The Read ladder's top rung: counting finished reads stops here. */
const PIECES_READ_CAP = 50;

/** "N of M {unit}", singular when M is 1. */
const UNITS: Record<GoalCounter, readonly [one: string, many: string]> = {
	areas_unlocked: ["area unlocked", "areas unlocked"],
	days_showed_up: ["day showing up", "days showing up"],
	pieces_read: ["piece read", "pieces read"],
	sessions: ["session finished", "sessions finished"],
	streak: ["day in a row", "days in a row"],
};

const achievementViewValidator = v.object({
	achievementId: v.string(),
	art: badgeArtValidator,
	copy: v.string(),
	// Set once earned; locked badges have none.
	earnedAt: v.optional(v.number()),
	// Only on the next rung of a ladder: the first one not yet earned.
	progress: v.optional(
		v.object({ current: v.number(), target: v.number(), unit: v.string() })
	),
	// What it awarded (the value at award time) or will award.
	sparks: v.number(),
	title: v.string(),
});

type AchievementView = typeof achievementViewValidator.type;
type Earned = Map<string, Doc<"user_achievements">>;

/** Widened once, so filtering by category needs no cast. */
const FIXED: readonly Achievement[] = FIXED_ACHIEVEMENTS;

/** The fixed rungs per category, with the streak ladder listed far enough to show what's next. */
function catalogFor(category: AchievementCategory, bestStreak: number) {
	if (category !== "streak") {
		return FIXED.filter((a) => a.category === category);
	}
	return streakAchievementsThrough(
		Math.max(STREAK_SHOWN_THROUGH, nextStreakRungAfter(bestStreak))
	);
}

/** Each counter read at most once per query, and only if a next rung needs it. */
function counterReader(ctx: QueryCtx, profile: Doc<"emotional_profiles">) {
	const read: Record<GoalCounter, () => Promise<number>> = {
		areas_unlocked: async () => profile.unlockedDomains?.length ?? 0,
		days_showed_up: async () => profile.daysShowedUp ?? 0,
		pieces_read: async () =>
			(
				await ctx.db
					.query("library_reads")
					.withIndex(
						"by_emotionalProfileId_and_finishedAt_and_lastReadAt",
						(q) => q.eq("emotionalProfileId", profile._id).gt("finishedAt", 0)
					)
					.take(PIECES_READ_CAP)
			).length,
		sessions: async () => profile.sessionCount,
		streak: async () => (await streakState(ctx, profile)).streak,
	};
	const cache = new Map<GoalCounter, Promise<number>>();
	return (counter: GoalCounter) => {
		let value = cache.get(counter);
		if (!value) {
			value = read[counter]();
			cache.set(counter, value);
		}
		return value;
	};
}

/** The whole shelf: categories in screen order, each earned → next rungs → locked. */
async function buildShelf(ctx: QueryCtx, profile: Doc<"emotional_profiles">) {
	const rows = await ctx.db
		.query("user_achievements")
		.withIndex("by_emotionalProfileId_and_earnedAt", (q) =>
			q.eq("emotionalProfileId", profile._id)
		)
		.order("desc")
		.take(EARNED_LIMIT);
	const earned: Earned = new Map(rows.map((r) => [r.achievementId, r]));
	// The best streak the rows or the profile record, whichever is further.
	const bestStreak = Math.max(
		profile.longestStreak ?? 0,
		...rows.map((r) => {
			const goal = findAchievement(r.achievementId)?.goal;
			return goal?.counter === "streak" ? goal.target : 0;
		})
	);
	const count = counterReader(ctx, profile);
	const arts = new Map<string, Promise<BadgeArt>>();
	const view = async (
		a: Achievement,
		withProgress: boolean
	): Promise<AchievementView> => {
		let art = arts.get(a.artKey);
		if (!art) {
			art = badgeArt(ctx, a.artKey);
			arts.set(a.artKey, art);
		}
		const row = earned.get(a.achievementId);
		const goal = withProgress ? a.goal : undefined;
		const [one, many] = goal ? UNITS[goal.counter] : ["", ""];
		return {
			achievementId: a.achievementId,
			art: await art,
			copy: a.copy,
			earnedAt: row?.earnedAt,
			progress: goal && {
				current: Math.min(await count(goal.counter), goal.target),
				target: goal.target,
				unit: goal.target === 1 ? one : many,
			},
			sparks: row?.sparks ?? a.sparks,
			title: a.title,
		};
	};

	const categories = await Promise.all(
		ACHIEVEMENT_CATEGORIES.map(async ({ category, title }) => {
			const all = catalogFor(category, bestStreak);
			const done = all.filter((a) => earned.has(a.achievementId));
			const locked = all.filter((a) => !earned.has(a.achievementId));
			// A ladder's next rung is its first one not yet earned.
			const next = locked.filter(
				(a, i) =>
					a.goal &&
					locked.findIndex((b) => b.goal?.counter === a.goal?.counter) === i
			);
			const rest = locked.filter((a) => !next.includes(a));
			return {
				achievements: await Promise.all([
					...done.map((a) => view(a, false)),
					...next.map((a) => view(a, true)),
					...rest.map((a) => view(a, false)),
				]),
				category,
				title,
			};
		})
	);
	return { categories, rows, view };
}

/** The rung closest to done by share of its target; the earliest on screen wins a tie. */
function nextUp(all: AchievementView[]) {
	let best: AchievementView | undefined;
	const share = (a: AchievementView) =>
		a.progress ? a.progress.current / a.progress.target : -1;
	for (const a of all) {
		if (a.progress && (!best || share(a) > share(best))) {
			best = a;
		}
	}
	return best ?? null;
}

const categoryValidator = v.union(
	...ACHIEVEMENT_CATEGORIES.map(({ category }) => v.literal(category))
);

export const overview = query({
	args: {},
	handler: async (ctx) => {
		const { profile } = await requireAuth(ctx);
		const { categories, rows } = await buildShelf(ctx, profile);
		const all = categories.flatMap((c) => c.achievements);
		const latestId = rows.find((r) =>
			findAchievement(r.achievementId)
		)?.achievementId;
		return {
			categories,
			sparks: {
				badgeCount: all.filter((a) => a.earnedAt !== undefined).length,
				balance: profile.sparkBalance ?? 0,
				earned: profile.sparksEarned ?? 0,
				freezePrice: FREEZE_SPARK_PRICE,
				latest: all.find((a) => a.achievementId === latestId) ?? null,
				nextUp: nextUp(all),
			},
		};
	},
	returns: v.object({
		categories: v.array(
			v.object({
				achievements: v.array(achievementViewValidator),
				category: categoryValidator,
				title: v.string(),
			})
		),
		sparks: v.object({
			badgeCount: v.number(),
			balance: v.number(),
			earned: v.number(),
			freezePrice: v.number(),
			latest: v.union(achievementViewValidator, v.null()),
			nextUp: v.union(achievementViewValidator, v.null()),
		}),
	}),
});

/** One badge for the detail page; null for an id the catalog doesn't know. */
export const get = query({
	args: { achievementId: v.string() },
	handler: async (ctx, { achievementId }) => {
		const { profile } = await requireAuth(ctx);
		const { categories, view } = await buildShelf(ctx, profile);
		const shown = categories
			.flatMap((c) => c.achievements)
			.find((a) => a.achievementId === achievementId);
		if (shown) {
			return shown;
		}
		// A streak rung past the listed ladder (an old link): no progress to show.
		const achievement = findAchievement(achievementId);
		return achievement ? await view(achievement, false) : null;
	},
	returns: v.union(achievementViewValidator, v.null()),
});
