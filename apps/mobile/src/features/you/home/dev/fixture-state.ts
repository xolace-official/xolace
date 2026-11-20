import { FIXTURE_AVATARS } from "@/features/you/avatar/dev/avatars";
import { resolveAvatar } from "@/features/you/avatar-model";
import { indexHistory, weekDays } from "@/features/you/home/days-model";
import {
	type BadgeCount,
	FIXTURE_FOLLOW_UPS,
	FIXTURE_NOW,
	fixtureRank,
	fixtureShelf,
	fixtureSummary,
} from "@/features/you/home/dev/fixtures";
import {
	FIXTURE_TODAY,
	fixtureHistory,
	type HistoryKind,
} from "@/features/you/home/dev/history";
import {
	fixtureInsights,
	fixtureIntensity,
	type WeekFixture,
} from "@/features/you/home/dev/insights-fixtures";
import {
	followUpItems,
	waitingCount,
} from "@/features/you/home/follow-ups-model";
import { steadinessCard } from "@/features/you/home/steadiness/steadiness-model";
import type { YouHome } from "@/features/you/home/you-data";
import {
	badgesRowView,
	chipsView,
	heroView,
	patternRows,
	rankView,
	streakView,
} from "@/features/you/home/you-model";
import { freezeReason } from "@/lib/streak-freeze";

export type YouFixture = {
	kind?: HistoryKind;
	badges?: BadgeCount;
	plus?: boolean;
	freezes?: number;
	hidden?: readonly ("calendar" | "rank" | "week")[];
	earlierWeek?: boolean;
	week?: WeekFixture;
	noFollowUps?: boolean;
};

const noop = () => undefined;

export function fixtureYou({
	kind = "regular",
	badges = "many",
	plus = true,
	freezes = kind === "regular" ? 1 : 0,
	hidden = [],
	noFollowUps = kind === "new",
	earlierWeek = false,
	week = "board",
}: YouFixture = {}): YouHome {
	const summary = { ...fixtureSummary(kind), streakFreezes: freezes };
	const shelf = fixtureShelf(kind, badges, freezes);
	const history = indexHistory(fixtureHistory(kind), FIXTURE_TODAY);
	const open = noFollowUps
		? { upcoming: [], waiting: [] }
		: FIXTURE_FOLLOW_UPS.open;
	return {
		actions: {
			buyFreeze: noop,
			checkIn: noop,
			closeFollowUp: noop,
			loadMoreFollowUps: noop,
			openAvatar: noop,
			openBadges: noop,
			openEarlierWeeks: noop,
			openPlus: noop,
			openSettings: noop,
			openSteadiness: noop,
			pageWeek: noop,
			weekSeen: noop,
		},
		state: {
			avatar: resolveAvatar(FIXTURE_AVATARS, summary.avatarId),
			badges: badgesRowView(shelf),
			buying: false,
			chips: chipsView(summary),
			days: hidden.includes("calendar") ? null : history,
			followUps: {
				items: followUpItems(
					open,
					noFollowUps ? [] : FIXTURE_FOLLOW_UPS.history,
					true
				),
				loadingMore: false,
				waiting: waitingCount(open),
			},
			freeze: {
				price: shelf.freezePrice,
				reason: freezeReason(shelf),
				sparks: shelf.balance,
			},
			hero: heroView(summary, FIXTURE_NOW),
			intensity:
				hidden.includes("week") || summary.sessionCount < 1
					? null
					: fixtureIntensity({ earlier: earlierWeek, plus, week }),
			patterns: patternRows(
				summary.sessionCount,
				"lighter",
				summary.typicalUsagePattern
			),
			plusRow: !plus,
			rank: hidden.includes("rank") ? null : rankView(fixtureRank(kind)),
			steadiness: steadinessCard(
				fixtureInsights(kind === "new" ? "new" : "regular", plus),
				plus,
				FIXTURE_NOW
			),
			streak: streakView(summary),
			week: weekDays(history),
		},
	};
}
