/**
 * The You tab's data hook: production's profile reads (summary, history, the sparks shelf,
 * avatars, mood, rank, follow-ups), the hidden cards (B7), the freeze buy and the doors out.
 * The one file here that calls Convex, PostHog, the paywall or the toast.
 */
import { api } from "@xolace/backend/api";
import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { toast } from "@/components/shared/toast";
import { usePaywall } from "@/features/purchases/use-paywall";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import { resolveAvatar } from "@/features/you/avatar-model";
import {
	indexHistory,
	todayIn,
	weekDays,
} from "@/features/you/home/days-model";
import { useHiddenCards } from "@/features/you/home/use-hidden-cards";
import { useYouFollowUps } from "@/features/you/home/use-you-follow-ups";
import type { YouHome } from "@/features/you/home/you-data";
import {
	badgesRowView,
	chipsView,
	heroView,
	patternRows,
	rankView,
	streakView,
} from "@/features/you/home/you-model";
import { convexErrorCode } from "@/lib/convex-error-code";
import { playAffirmativePress } from "@/lib/haptics";
import { useProfileSummary } from "@/lib/profile-summary";
import { freezeReason, freezeRefusal } from "@/lib/streak-freeze";

export function useYou(): YouHome {
	const summary = useProfileSummary();
	const history = useQuery(api.streaks.history.get);
	const shelf = useQuery(api.achievements.display.shelf);
	const avatars = useQuery(api.avatars.listAvatars);
	const mood = useQuery(api.profile.getMoodDelta);
	const rank = useQuery(api.profile.getReflectionRank);
	const hidden = useHiddenCards();
	const followUps = useYouFollowUps();
	const { isPlus, isLoading: plusLoading } = usePlusEntitlement();
	const openPaywall = usePaywall((s) => s.open);
	const buyFreeze = useMutation(api.achievements.sparks.buyFreeze);
	const [buying, setBuying] = useState(false);
	// Two quick taps land before `buying` re-renders: the ref stops the second purchase.
	const inFlight = useRef(false);

	const indexed = history
		? indexHistory(history, todayIn(history.timezone))
		: undefined;
	const hides = (card: "calendar" | "rank") =>
		hidden === undefined ? undefined : hidden.includes(card);

	const buy = async () => {
		if (!shelf || inFlight.current) {
			return;
		}
		const reason = freezeReason(shelf);
		if (reason) {
			toast(reason, { variant: "warning" });
			return;
		}
		inFlight.current = true;
		setBuying(true);
		try {
			await buyFreeze();
			playAffirmativePress();
		} catch (error) {
			toast(freezeRefusal(convexErrorCode(error), shelf.freezeCap), {
				variant: "warning",
			});
		} finally {
			inFlight.current = false;
			setBuying(false);
		}
	};

	const daysHidden = hides("calendar");
	const rankHidden = hides("rank");
	return {
		actions: {
			buyFreeze: () => {
				buy().catch(() => undefined);
			},
			checkIn: followUps.actions.checkIn,
			closeFollowUp: followUps.actions.close,
			loadMoreFollowUps: followUps.actions.loadMore,
			openAvatar: () => router.push("/avatar"),
			openBadges: () => router.push("/achievements"),
			openPlus: () => openPaywall("profile_row"),
			openSettings: () => router.push("/settings"),
		},
		state: {
			avatar: avatars ? resolveAvatar(avatars, summary?.avatarId) : undefined,
			badges: shelf ? badgesRowView(shelf) : undefined,
			buying,
			chips: summary ? chipsView(summary) : [],
			days: daysHidden === undefined ? undefined : daysHidden ? null : indexed,
			followUps: followUps.state,
			freeze: shelf
				? {
						price: shelf.freezePrice,
						reason: freezeReason(shelf),
						sparks: shelf.balance,
					}
				: undefined,
			hero: summary ? heroView(summary, new Date()) : undefined,
			patterns: summary
				? patternRows(summary.sessionCount, mood, summary.typicalUsagePattern)
				: [],
			// A door, always there for free users (production). `isPlus` is false while the
			// entitlement resolves; waiting keeps a subscriber from watching the row come and go.
			plusRow: !(plusLoading || isPlus),
			rank:
				rankHidden === undefined || rank === undefined
					? undefined
					: rankHidden || rank === null
						? null
						: rankView(rank),
			streak: summary ? streakView(summary) : undefined,
			week: indexed ? weekDays(indexed) : undefined,
		},
	};
}
