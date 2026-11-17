/** The Achievements screen and its badge page, from the server's overview: pure. */
import type { api } from "@xolace/backend/api";
import type { FunctionReturnType } from "convex/server";
import {
	type AchievementsOverview,
	type AchievementView,
	type Art,
	artOf,
	type Family,
	familyOf,
	familyOfId,
	progressLabel,
	progressShare,
} from "@/features/achievements/achievements-model";
import { COPY } from "@/features/achievements/copy";

/** One badge as the list and its page draw it. */
export type BadgeView = {
	id: string;
	title: string;
	copy: string;
	art: Art;
	family: Family;
	/** When it was earned; undefined while it's locked. */
	earnedAt?: number;
	pinned: boolean;
	sparks: number;
	/** Only on a ladder's next rung. */
	progress?: { label: string; share: number; current: number; target: number };
};

export type CategoryView = {
	title: string;
	/** "4 of 25 unlocked". */
	count: string;
	badges: BadgeView[];
};

export type SparksView = {
	earned: number;
	/** "145 to spend · 11 badges". */
	spend: string;
	latest: BadgeView | null;
	nextUp: {
		title: string;
		current: number;
		target: number;
		label: string;
	} | null;
};

export type BadgesView = {
	categories: CategoryView[];
	sparks: SparksView;
	/** Every badge on the screen, by id: the page reads the one that's out. */
	byId: ReadonlyMap<string, BadgeView>;
	pinnedCount: number;
};

/** The server's view of one badge, in a known category or (for `latest`) by its id. */
function badgeView(a: AchievementView, family?: Family): BadgeView {
	return {
		art: artOf(a.art),
		copy: a.copy,
		earnedAt: a.earnedAt,
		family: family ?? familyOfId(a.achievementId),
		id: a.achievementId,
		pinned: a.pinned,
		progress: a.progress && {
			current: a.progress.current,
			label: progressLabel(a.progress),
			share: progressShare(a.progress),
			target: a.progress.target,
		},
		sparks: a.sparks,
		title: a.title,
	};
}

export function badgesView(overview: AchievementsOverview): BadgesView {
	const byId = new Map<string, BadgeView>();
	const categories = overview.categories.map((c) => {
		const badges = c.achievements.map((a) => {
			const view = badgeView(a, familyOf(c.category));
			byId.set(view.id, view);
			return view;
		});
		const earned = badges.filter((b) => b.earnedAt !== undefined).length;
		return {
			badges,
			count: COPY.list.unlocked(earned, badges.length),
			title: c.title,
		};
	});
	const { badgeCount, balance, earned, latest, nextUp } = overview.sparks;
	return {
		byId,
		categories,
		pinnedCount: [...byId.values()].filter((b) => b.pinned).length,
		sparks: {
			earned,
			latest: latest
				? (byId.get(latest.achievementId) ?? badgeView(latest))
				: null,
			nextUp: nextUp?.progress
				? {
						current: nextUp.progress.current,
						label: progressLabel(nextUp.progress),
						target: nextUp.progress.target,
						title: nextUp.title,
					}
				: null,
			spend: COPY.list.spend(balance, badgeCount),
		},
	};
}

/** One label for a whole tile, so VoiceOver doesn't read the title twice. */
export function tileLabel(b: BadgeView): string {
	return [
		b.earnedAt === undefined ? `${b.title}, locked` : b.title,
		b.pinned && "pinned",
		b.progress?.label,
	]
		.filter(Boolean)
		.join(", ");
}

/** The page's hint under the badge. */
export function heldHint(earned: boolean, reduced: boolean): string {
	if (!earned) {
		return COPY.badge.hint.locked;
	}
	return reduced ? COPY.badge.hint.tap : COPY.badge.hint.drag;
}

/** Production's pin limit (`achievements/pins.ts`): three, a fourth is refused, never swapped. */
export const PIN_LIMIT = 3;

/** Whether a pin would be refused before asking the server: earned only, three at most. */
export function pinRefused(b: BadgeView, pinnedCount: number): boolean {
	return !b.pinned && pinnedCount >= PIN_LIMIT;
}

/** What a refused pin or unpin says: the server's limit, or a failure. */
export function pinRefusal(code: unknown, pinning: boolean): string {
	if (code === "pin_limit_reached") {
		return COPY.pins.limit;
	}
	return pinning ? COPY.pins.pinFailed : COPY.pins.unpinFailed;
}

export type SparkShelf = FunctionReturnType<
	typeof api.achievements.display.shelf
>;

/** The freeze card at the foot: its line, and why the buy is off (null when it's on). */
export type FreezeView = { line: string; reason: string | null; buy: string };

/** Mirrors `sparks.buyFreeze`'s checks, in production's order (profile-spark-card). */
export function freezeView(shelf: SparkShelf): FreezeView {
	const { balance, freezeCap, freezePrice, freezes, streakLapsed } = shelf;
	const short = freezePrice - balance;
	let reason: string | null = null;
	if (streakLapsed) {
		reason = COPY.freeze.lapsed;
	} else if (short > 0) {
		reason = COPY.freeze.short(short);
	} else if (freezes >= freezeCap) {
		reason = COPY.freeze.capped(freezeCap);
	}
	return {
		buy: COPY.freeze.buy(freezePrice),
		line: reason ?? COPY.freeze.holds(freezes, freezeCap),
		reason,
	};
}

/** What a refused buy says: a race the card hadn't caught up with, or a failure. */
export function freezeRefusal(code: unknown, freezeCap: number): string {
	switch (code) {
		case "freeze_cap_reached":
			return COPY.freeze.capped(freezeCap);
		case "insufficient_sparks":
			return COPY.freeze.notEnough;
		case "streak_lapsed":
			return COPY.freeze.lapsed;
		default:
			return COPY.freeze.failed;
	}
}
