import type { api } from "@xolace/backend/api";
import {
	FREEZE_CAP,
	FREEZE_EARN_EVERY,
} from "@xolace/backend/convex/lib/streakFreezes";
import type { FunctionReturnType } from "convex/server";
import type { IconName } from "@/components/shared/icon";
import { COPY } from "@/features/you/copy";
import type { ProfileSummary } from "@/lib/profile-summary";

export type Shelf = FunctionReturnType<typeof api.achievements.display.shelf>;
export type MoodDelta = FunctionReturnType<typeof api.profile.getMoodDelta>;
export type Rank = FunctionReturnType<typeof api.profile.getReflectionRank>;
export type ProfileCard = FunctionReturnType<
	typeof api.preferences.profileCards.getHidden
>[number];

const USUAL_DAY_FROM = 5;
const CHIPS_FROM = 1;
const PATTERNS_FROM = 3;
const RHYTHM_FROM = 5;
const CHIPS_SHOWN = 3;
const MEDALS_SHOWN = 3;

export type Hero = {
	name: string;
	greeting: string;
	since: string | null;
	isNew: boolean;
};

export function heroView(summary: ProfileSummary, now: Date): Hero {
	const isNew = summary.sessionCount === 0;
	let since: string | null = null;
	if (!isNew && summary.firstSessionAt !== null) {
		const first = new Date(summary.firstSessionAt);
		since = COPY.hero.since(
			first.getMonth(),
			first.getFullYear() === now.getFullYear() ? null : first.getFullYear()
		);
	}
	return {
		greeting: COPY.hero.greeting(now.getHours(), summary.displayName),
		isNew,
		name: summary.displayName,
		since,
	};
}

export type Streak = {
	streak: number;
	best: number | null;
	moments: number;
	momentsLabel: string;
	usualDay: string;
	freezes: number;
	label: string;
};

export function streakView(summary: ProfileSummary): Streak | null {
	const {
		currentStreak,
		longestStreak,
		sessionCount,
		streakFreezes,
		typicalUsagePattern,
	} = summary;
	const freezes = streakFreezes ?? 0;
	if (sessionCount === 0 && freezes === 0) {
		return null;
	}
	const best = longestStreak > currentStreak ? longestStreak : null;
	const usual =
		sessionCount >= USUAL_DAY_FROM && typicalUsagePattern
			? COPY.streak.weekdays[typicalUsagePattern.dayOfWeek]
			: undefined;
	return {
		best,
		freezes,
		label:
			currentStreak > 0
				? COPY.streak.label(currentStreak, longestStreak)
				: COPY.streak.ended,
		moments: sessionCount,
		momentsLabel: COPY.streak.moments(sessionCount),
		streak: currentStreak,
		usualDay: usual ?? COPY.streak.none,
	};
}

export function freezeCopy(
	freezes: number,
	lit: boolean
): { label: string; hint: string } {
	const label = COPY.streak.freeze.hold(freezes, lit);
	const use = lit ? COPY.streak.freeze.use : COPY.streak.freeze.saved;
	let hint: string = use;
	if (freezes === 0) {
		hint = COPY.streak.freeze.earn(FREEZE_EARN_EVERY);
	} else if (freezes >= FREEZE_CAP) {
		hint = COPY.streak.freeze.max(use, FREEZE_CAP);
	}
	return { hint, label };
}

export type Medal = {
	id: string;
	title: string;
	url: string | null;
	thumbhash: string | null;
	lit: boolean;
};

export type BadgesRow = {
	count: number;
	title: string;
	sub: string;
	label: string;
	star: boolean;
	medals: Medal[];
};

export function badgesRowView(shelf: Shelf): BadgesRow {
	const count = shelf.badgeCount;
	const title = COPY.badges.title(count);
	const only = count === 1 ? shelf.badges[0] : undefined;
	return {
		count,
		label: COPY.badges.label(title, shelf.balance),
		medals: shelf.badges.slice(0, MEDALS_SHOWN).map((b) => ({
			id: b.achievementId,
			lit: !b.art.fallback,
			thumbhash: b.art.thumbhash,
			title: b.title,
			url: b.art.url,
		})),
		star: count <= 1,
		sub: only
			? COPY.badges.one(only.title, shelf.balance)
			: COPY.badges.sub(shelf.balance, shelf.freezePrice),
		title,
	};
}

type Pattern = NonNullable<ProfileSummary["typicalUsagePattern"]>;
export type PatternRow = { icon: IconName; text: string };

const DAYS = [
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
];

const MOOD_ICON = {
	heavier: { android: "arrow_circle_down", ios: "arrow.down.circle" },
	lighter: { android: "arrow_circle_up", ios: "arrow.up.circle" },
	mixed: { android: "data_usage", ios: "circle.dotted" },
	same: { android: "contrast", ios: "circle.lefthalf.filled" },
	unsure: { android: "help", ios: "questionmark.circle" },
} as const satisfies Record<string, IconName>;

function rhythmRow(pattern: Pattern): PatternRow | null {
	const day = DAYS[pattern.dayOfWeek];
	if (!day) {
		return null;
	}
	const h = pattern.hourOfDay;
	if (h >= 5 && h < 12) {
		return {
			icon: { android: "wb_twilight", ios: "sunrise" },
			text: COPY.insights.rhythm(day, "mornings"),
		};
	}
	if (h >= 12 && h < 17) {
		return {
			icon: { android: "light_mode", ios: "sun.max" },
			text: COPY.insights.rhythm(day, "afternoons"),
		};
	}
	if (h >= 17 && h < 21) {
		return {
			icon: { android: "wb_twilight", ios: "sunset" },
			text: COPY.insights.rhythm(day, "evenings"),
		};
	}
	return {
		icon: { android: "moon_stars", ios: "moon.stars" },
		text: COPY.insights.rhythm(day, "late nights"),
	};
}

export function patternRows(
	sessionCount: number,
	mood: MoodDelta | undefined,
	pattern: Pattern | null
): PatternRow[] {
	if (sessionCount < PATTERNS_FROM) {
		return [];
	}
	const rows: PatternRow[] = [];
	if (mood) {
		rows.push({ icon: MOOD_ICON[mood], text: COPY.insights.mood[mood] });
	}
	const rhythm =
		sessionCount >= RHYTHM_FROM && pattern ? rhythmRow(pattern) : null;
	if (rhythm) {
		rows.push(rhythm);
	}
	return rows;
}

export function chipsView(summary: ProfileSummary): string[] {
	if (summary.sessionCount < CHIPS_FROM) {
		return [];
	}
	return summary.dominantEmotionTags.slice(0, CHIPS_SHOWN);
}

export type RankCard = {
	pct: string | null;
	line: string;
	foot: string;
};

export function rankView(rank: NonNullable<Rank>): RankCard {
	if (rank.status === "ranked") {
		return {
			foot: COPY.rank.moments(rank.sessionCount),
			line: COPY.rank.line,
			pct: COPY.rank.pct(rank.percentile),
		};
	}
	let foot: string = COPY.rank.warming;
	if (rank.status === "pending") {
		foot =
			rank.sessionCount === 0
				? COPY.rank.pendingFirst
				: COPY.rank.pending(rank.threshold, rank.remaining);
	}
	return { foot, line: COPY.rank.unlit, pct: null };
}
