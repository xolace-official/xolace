import { api } from "@xolace/backend/api";
import { useMutation, useQuery } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { useEffect, useState } from "react";
import { deviceTimezone, preparePushDelivery } from "@/lib/push-delivery";
import { getPushPermissionState } from "@/lib/push-token";
import { usePreferenceMutation } from "@/lib/use-preference-mutation";
import { QUOTE_COPY } from "../copy";
import {
	type DailyQuoteSlot,
	mayOfferDailyQuote,
	type OfferTrigger,
	offerAnswer,
} from "./daily-quote-offer";
import { useOfferMemory } from "./offer-memory";

/** The phone's notification permission, checked once; undefined until it answers. */
function useOsBlocked(): boolean | undefined {
	const [blocked, setBlocked] = useState<boolean | undefined>(undefined);
	useEffect(() => {
		let mounted = true;
		const settle = (next: boolean) => {
			if (mounted) {
				setBlocked(next);
			}
		};
		getPushPermissionState()
			.then((state) => settle(state === "blocked"))
			.catch(() => settle(true));
		return () => {
			mounted = false;
		};
	}, []);
	return blocked;
}

/**
 * The one-time daily quote offer on Quotes (B19): whether it may rise, marking it shown, and its
 * answer. A phone that has denied notifications is never asked: only device settings could turn
 * it on.
 */
export function useDailyQuoteOffer() {
	const posthog = usePostHog();
	const prefs = useQuery(api.preferences.get);
	const updatePreferences = usePreferenceMutation();
	const registerToken = useMutation(api.notifications.registerToken);
	const seen = useOfferMemory((s) => s.seen);
	const blocked = useOsBlocked();

	/** Turns push on first when this device isn't delivering, the way Settings does. */
	const answer = (slot: DailyQuoteSlot | null): Promise<string | null> => {
		posthog.capture("daily_quote_offer_answered", {
			answer: slot ?? "not_now",
		});
		if (!slot) {
			return updatePreferences({
				notificationDailyQuote: offerAnswer(null),
			}).then(() => null);
		}
		return preparePushDelivery(
			prefs?.notifications.enabled === true,
			// Push for the daily quote alone: no first-grant auto-enable of the rest.
			(pushToken) => registerToken({ autoEnable: false, pushToken })
		).then((readiness): Promise<string | null> | string | null => {
			if (readiness === "blocked") {
				return QUOTE_COPY.dailyQuote.blocked;
			}
			if (readiness === "unavailable") {
				return QUOTE_COPY.errors.generic;
			}
			const timezone = deviceTimezone();
			const zone =
				readiness === "registered" && timezone
					? { notificationTimezone: timezone }
					: {};
			return updatePreferences({
				...zone,
				notificationDailyQuote: offerAnswer(slot),
			}).then(() =>
				QUOTE_COPY.dailyQuote.turnedOn(QUOTE_COPY.dailyQuote.slots[slot])
			);
		});
	};

	return {
		answer: (slot: DailyQuoteSlot | null) =>
			answer(slot).catch((e: unknown) => {
				console.error("[quotes] daily quote offer failed", e);
				return QUOTE_COPY.errors.generic;
			}),
		offerable: mayOfferDailyQuote({
			blocked,
			chosen: prefs ? prefs.notifications.dailyQuote !== undefined : undefined,
			seen,
		}),
		shown: (trigger: OfferTrigger) => {
			useOfferMemory.setState({ seen: true });
			posthog.capture("daily_quote_offer_shown", { trigger });
		},
	};
}
