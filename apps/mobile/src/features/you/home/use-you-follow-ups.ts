import { api } from "@xolace/backend/api";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { router } from "expo-router";
import { usePostHog } from "posthog-react-native";
import {
	type FollowUpCard,
	followUpItems,
	waitingCount,
} from "@/features/you/home/follow-ups-model";

const PAGE_SIZE = 20;

export function useYouFollowUps() {
	const posthog = usePostHog();
	const open = useQuery(api.followUps.profileOpenCards, {});
	const history = usePaginatedQuery(
		api.followUps.listForProfilePage,
		{},
		{ initialNumItems: PAGE_SIZE }
	);
	const markShown = useMutation(api.followUps.markShown);
	const resolveCard = useMutation(api.followUps.resolveCard);

	const items =
		open && history.status !== "LoadingFirstPage"
			? followUpItems(open, history.results, history.status === "Exhausted")
			: undefined;

	const loadMore = () => {
		if (history.status === "CanLoadMore") {
			history.loadMore(PAGE_SIZE);
		}
	};

	const checkIn = (card: FollowUpCard) => {
		markShown({ cardId: card._id }).catch(() => undefined);
		posthog.capture("follow_up_shown", {
			escalation_derived: card.escalationDerived,
			source: "profile",
			tier: card.tier,
		});
		router.push({
			params: {
				cardId: card._id,
				cardText: card.cardText,
				createdAt: String(card.createdAt),
				escalation: card.escalationDerived ? "1" : undefined,
				tier: card.tier,
			},
			pathname: "/check-in",
		});
	};

	const close = (card: FollowUpCard) => {
		resolveCard({ cardId: card._id, response: "dismissed" }).catch(
			() => undefined
		);
	};

	return {
		actions: { checkIn, close, loadMore },
		state: {
			items,
			loadingMore: history.status === "LoadingMore",
			waiting: waitingCount(open),
		},
	};
}
