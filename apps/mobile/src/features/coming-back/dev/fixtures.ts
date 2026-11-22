import type { Id } from "@xolace/backend/dataModel";
import type {
	Items,
	MonthEvent,
	Outcomes,
	WaitingCard,
} from "@/features/coming-back/coming-back-model";
import { NO_OUTCOMES } from "@/features/coming-back/coming-back-model";
import type { CheckInTier } from "@/features/coming-back/copy";

export const FIXTURE_NAME = "Ama";
const TUESDAY = new Date(2026, 10, 17, 21).getTime();
const FIXTURE_STREAK = 12;

export const fixtureCard = (tier: CheckInTier = "standard"): WaitingCard => ({
	_id: "fixture_card" as Id<"follow_up_cards">,
	cardText:
		tier === "acute"
			? "Tuesday night was a lot. How are you doing today?"
			: "On Tuesday, work wouldn’t leave your head. How is it sitting now?",
	createdAt: TUESDAY,
	escalationDerived: false,
	shown: false,
	tier,
});

export const FIXTURE_EVENT: MonthEvent = {
	_creationTime: 0,
	_id: "fixture_event" as Id<"monthlyEvents">,
	body: "All month, people are talking about the kind of heavy that hides behind “I’m fine”. You don’t have to tell anyone else. Saying it here counts.",
	endDate: "2026-11-30",
	linkUrl: "https://example.com/article",
	priority: 0,
	sessionPrompt: "What have you been carrying that nobody asks about?",
	slug: "fixture-november",
	startDate: "2026-11-01",
	title: "The weight we don’t say out loud",
};

export const fixtureItems = (
	over: Partial<Items> & { tier?: CheckInTier } = {}
): Items => {
	const { tier, ...rest } = over;
	return {
		card: fixtureCard(tier),
		day: "Tuesday",
		event: FIXTURE_EVENT,
		freeze: { days: 2, streak: FIXTURE_STREAK },
		...rest,
	};
};

export const LIGHTER_DONE: Outcomes = {
	...NO_OUTCOMES,
	answer: "lighter",
	ckDone: true,
};
