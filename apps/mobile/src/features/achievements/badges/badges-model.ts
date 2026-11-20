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
import { freezeReason } from "@/lib/streak-freeze";

export type BadgeView = {
	id: string;
	title: string;
	copy: string;
	art: Art;
	family: Family;
	earnedAt?: number;
	pinned: boolean;
	sparks: number;
	progress?: { label: string; share: number; current: number; target: number };
};

export type CategoryView = {
	title: string;
	count: string;
	badges: BadgeView[];
};

export type SparksView = {
	earned: number;
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
	byId: ReadonlyMap<string, BadgeView>;
	pinnedCount: number;
};

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

export function tileLabel(b: BadgeView): string {
	return [
		b.earnedAt === undefined ? `${b.title}, locked` : b.title,
		b.pinned && "pinned",
		b.progress?.label,
	]
		.filter(Boolean)
		.join(", ");
}

export function heldHint(earned: boolean, reduced: boolean): string {
	if (!earned) {
		return COPY.badge.hint.locked;
	}
	return reduced ? COPY.badge.hint.tap : COPY.badge.hint.drag;
}

export const PIN_LIMIT = 3;

export function pinRefused(b: BadgeView, pinnedCount: number): boolean {
	return !b.pinned && pinnedCount >= PIN_LIMIT;
}

export function pinRefusal(code: unknown, pinning: boolean): string {
	if (code === "pin_limit_reached") {
		return COPY.pins.limit;
	}
	return pinning ? COPY.pins.pinFailed : COPY.pins.unpinFailed;
}

export type SparkShelf = FunctionReturnType<
	typeof api.achievements.display.shelf
>;

export type FreezeView = { line: string; reason: string | null; buy: string };

export function freezeView(shelf: SparkShelf): FreezeView {
	const reason = freezeReason(shelf);
	return {
		buy: COPY.freeze.buy(shelf.freezePrice),
		line: reason ?? COPY.freeze.holds(shelf.freezes, shelf.freezeCap),
		reason,
	};
}
