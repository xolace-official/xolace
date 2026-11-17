/**
 * The You tab on fixtures: the board's numbers (`P/src/fixtures/you-v2.ts`) as production's
 * reads return them, so the dev states and the tests run the real model. Dev only.
 */
import type { Id } from "@xolace/backend/dataModel";
import type { HistoryKind } from "@/features/you/home/dev/history";
import { medalArt } from "@/features/you/home/dev/medals";
import type { FollowUpCard } from "@/features/you/home/follow-ups-model";
import type { Rank, Shelf } from "@/features/you/home/you-model";
import type { ProfileSummary } from "@/lib/profile-summary";

const DAY_MS = 86_400_000;
/** Thursday 12 November 2026, 7 pm: "Evening". */
export const FIXTURE_NOW = new Date(2026, 10, 12, 19, 0);
const JOIN_AT = new Date(2026, 6, 28, 20, 0).getTime();

export function fixtureSummary(kind: HistoryKind): ProfileSummary {
	const isNew = kind === "new";
	return {
		avatarId: "moon",
		currentStreak: kind === "regular" ? 12 : 0,
		displayName: "Ama",
		dominantEmotionTags: isNew ? [] : ["tired", "overwhelmed", "hopeful"],
		firstSessionAt: isNew ? null : JOIN_AT,
		longestStreak: isNew ? 0 : 21,
		premiumRequired: true,
		recentWords: [],
		sessionCount: { ended: 31, new: 0, regular: 38 }[kind],
		streakFreezes: kind === "regular" ? 1 : 0,
		// Tuesday evening.
		typicalUsagePattern: isNew ? null : { dayOfWeek: 2, hourOfDay: 19 },
		wordCount: 0,
	};
}

export type BadgeCount = "one" | "many";

const MEDALS = [
	{ id: "streak-10", title: "10 days by the fire", tone: "ember" },
	{ id: "first-explore", title: "Found a way in", tone: "violet" },
	{ id: "streak-5", title: "5 days by the fire", tone: "mint" },
] as const;

export function fixtureShelf(
	kind: HistoryKind,
	badges: BadgeCount,
	freezes: number
): Shelf {
	const one = badges === "one" || kind === "new";
	const shown = one
		? [{ id: "joined", title: "You joined", tone: "ember" } as const]
		: MEDALS;
	return {
		badgeCount: one ? 1 : 9,
		badges: shown.map((m, i) => ({
			achievementId: m.id,
			art: { fallback: false, thumbhash: null, url: medalArt(m.tone) },
			copy: "",
			earnedAt: FIXTURE_NOW.getTime() - (i + 1) * DAY_MS,
			pinned: i === 0 && !one,
			sparks: 10,
			title: m.title,
		})),
		balance: one ? (kind === "new" ? 10 : 40) : 340,
		earned: one ? 10 : 340,
		freezeCap: 2,
		freezePrice: 50,
		freezes,
		streakLapsed: kind === "ended",
	};
}

export function fixtureRank(kind: HistoryKind): Rank {
	if (kind === "new") {
		return { remaining: 5, sessionCount: 0, status: "pending", threshold: 5 };
	}
	return {
		percentile: 64,
		sessionCount: kind === "regular" ? 38 : 31,
		status: "ranked",
	};
}

const card = (
	id: string,
	status: FollowUpCard["status"],
	cardText: string,
	daysAgo: number,
	userResponse?: FollowUpCard["userResponse"]
): FollowUpCard => ({
	_id: id as Id<"follow_up_cards">,
	cardText,
	createdAt: FIXTURE_NOW.getTime() - daysAgo * DAY_MS,
	escalationDerived: false,
	status,
	tier: "standard",
	userResponse,
});

/** The board's follow-ups: one waiting, one coming, two answered. */
export const FIXTURE_FOLLOW_UPS = {
	history: [
		card("f-sleep", "resolved", "Not sleeping well", 10, "lighter"),
		card("f-fight", "resolved", "The fight with J", 15, "processed"),
	],
	open: {
		upcoming: [card("f-mum", "pending", "The call with Mum", 0)],
		waiting: [
			card(
				"f-work",
				"ready",
				"The meeting is over, but you're still in the room with it.",
				7
			),
		],
	},
};
