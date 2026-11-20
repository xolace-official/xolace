import { api } from "@xolace/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useRef, useState } from "react";
import { toast } from "@/components/shared/toast";
import { useFullContext } from "@/lib/convex/use-full-context";
import { playAffirmativePress, playErrorNotice } from "@/lib/haptics";
import { LANDING } from "@/lib/landing";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useAppStore } from "@/store/store";
import type { CheckIn } from "./check-in-data";
import {
	type CheckInParams,
	cardFromParams,
	isCareful,
	nodOf,
	picksFor,
	questionOf,
} from "./coming-back-model";
import {
	type Answer,
	CHECK_IN,
	type CheckInPick,
	PLACES,
	type Place,
} from "./copy";
import { useEpisode } from "./episode-store";

/**
 * The check-in (handoff §6) on Convex: the answer is saved at the tap (`resolveCard`), the
 * reflective words on Done (`followUpResponses.record`). Leaving any way returns to the
 * greeting, where the row ticks; leaving before an answer writes nothing (§6.5).
 */
export function useCheckInData(): CheckIn {
	const own = cardFromParams(useLocalSearchParams<CheckInParams>());
	const episodeCard = useEpisode((s) => s.items.card);
	// From the greeting, the episode holds the card and ticks its row; on its own, nothing does.
	const card = own ?? episodeCard;
	const episode = own ? null : useEpisode.getState;
	const reduced = useEffectiveReducedMotion();
	const posthog = usePostHog();
	const resolveCard = useMutation(api.followUps.resolveCard);
	const record = useMutation(api.followUpResponses.record);
	const contributeByDefault =
		useQuery(api.preferences.getContributeByDefault) ?? false;
	const streak = useFullContext()?.streak ?? 0;
	const noteRatingsSignal = useAppStore((s) => s.noteRatingsSignal);

	const [picked, setPicked] = useState<Answer | null>(null);
	const [note, setNote] = useState("");
	const [shareChoice, setShareChoice] = useState<boolean | null>(null);
	const [saving, setSaving] = useState(false);
	const left = useRef(false);
	const answered = useRef(false);

	const careful = card ? isCareful(card) : true;
	const share = !careful && (shareChoice ?? contributeByDefault);
	const props: Record<string, string | boolean> = card
		? { escalation_derived: card.escalationDerived, tier: card.tier }
		: {};

	const leave = (later: boolean) => {
		if (left.current) {
			return;
		}
		left.current = true;
		episode?.().leaveCheckIn(later);
	};
	const close = () => {
		leave(false);
		router.back();
	};
	/** Saves the answer once; false on a second tap, so it can't navigate or log twice. */
	const answer = (a: Answer) => {
		if (answered.current || !card) {
			return false;
		}
		answered.current = true;
		setPicked(a);
		episode?.().answer(a);
		resolveCard({ cardId: card._id, response: a }).catch(() => undefined);
		// The rating screen waits 48 h after "Got heavier" (features/ratings, RatingsRules).
		noteRatingsSignal(a === "heavier" ? "check-in-heavier" : "check-in");
		posthog.capture("follow_up_responded", { ...props, response: a });
		return true;
	};

	const go = (place: Place) => {
		if (card && picked === "heavier") {
			record({
				cardId: card._id,
				heavierChoice: place,
				shareRequested: false,
			}).catch(() => undefined);
			posthog.capture("follow_up_heavier_choice", { choice: place });
		} else {
			posthog.capture("follow_up_still_here_link_tapped", {
				destination: place,
			});
		}
		if (place === "crisis_resources") {
			// Over the check-in: closing it comes back here.
			router.push(PLACES[place].href);
			return;
		}
		// Explore's pages are a tab: the greeting closes on the way (what waits goes to the pill).
		leave(false);
		router.dismissTo(LANDING);
		router.navigate(PLACES[place].href);
	};

	const done = async () => {
		if (saving || !card || !picked) {
			return;
		}
		const text = note.trim();
		const shared = share && text.length > 0;
		setSaving(true);
		const saved = await record({
			cardId: card._id,
			reflectionText: text,
			shareRequested: shared,
		}).catch(() => false);
		setSaving(false);
		if (!saved) {
			// The words stay so the user can retry.
			playErrorNotice();
			toast(CHECK_IN.reflective.saveFailed);
			return;
		}
		posthog.capture(`follow_up_${picked}_done`, {
			has_text: text.length > 0,
			shared,
		});
		// An empty Done closes quietly. The toast sits above the route, so it outlives the close.
		if (text) {
			playAffirmativePress();
			toast(
				shared ? CHECK_IN.reflective.savedShared : CHECK_IN.reflective.saved
			);
		}
		close();
	};

	return {
		actions: {
			close,
			done: () => {
				done().catch(() => undefined);
			},
			go,
			leaving: () => leave(false),
			pick: (a: CheckInPick) => {
				answer(a);
			},
			resources: () => {
				posthog.capture("follow_up_resources_tapped", {
					tier: card?.tier ?? null,
				});
				router.push("/crisis-resources");
			},
			setNote,
			setShare: setShareChoice,
			vent: () => {
				if (!answer("vent")) {
					return;
				}
				leave(true);
				router.replace("/voice-vent");
			},
		},
		state: {
			card,
			careful,
			nod: nodOf(streak),
			note,
			picked,
			picks: picksFor(card?.tier ?? "acute"),
			question: questionOf(card),
			reduced,
			saving,
			share,
		},
	};
}
