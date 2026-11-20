import { router, useIsFocused, useLocalSearchParams } from "expo-router";
import * as StoreReview from "expo-store-review";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef, useState } from "react";
import { Linking } from "react-native";
import { playAffirmativePress } from "@/lib/haptics";
import { reviewUrl } from "@/lib/store-review";
import { useAppStore } from "@/store/store";
import type { Rate } from "./rate-data";

type Params = { from?: "open" | "whatsnew" | "settings" };

const openReview = () => {
	Linking.openURL(reviewUrl(process.env.EXPO_OS)).catch(() => undefined);
};

/**
 * The rating screen on the real stores. Rate asks for the store's own prompt (`expo-store-review`;
 * neither store says whether it showed or what was rated), then the pill turns into Write a
 * review. A note sent from Tell us ends the ask: once the sheet has gone, so does this screen.
 */
export function useRate(): Rate {
	const { from } = useLocalSearchParams<Params>();
	const posthog = usePostHog();
	const focused = useIsFocused();
	const setRatings = useAppStore((s) => s.setRatings);
	const noteAt = useAppStore((s) => s.ratings.noteAt);
	const [rated, setRated] = useState(false);
	const [openedAt] = useState(Date.now);
	const closed = useRef(false);

	useEffect(() => {
		posthog.capture("rating_ask_shown", { from: from ?? "open" });
	}, [posthog, from]);

	const close = () => {
		if (closed.current) {
			return;
		}
		closed.current = true;
		router.dismiss(from === "whatsnew" ? 2 : 1);
	};

	const sentHere = noteAt !== null && noteAt >= openedAt;
	useEffect(() => {
		if (focused && sentHere) {
			close();
		}
	}, [focused, sentHere]);

	return {
		actions: {
			close: () => {
				posthog.capture("rating_ask_closed", { rated });
				close();
			},
			rate: () => {
				setRatings({ ratedAt: Date.now() });
				posthog.capture("rating_rate_tapped");
				StoreReview.isAvailableAsync()
					.then((available) =>
						available ? StoreReview.requestReview() : openReview()
					)
					.catch(openReview);
				setRated(true);
				playAffirmativePress();
			},
			tellUs: () => router.push("/ratings/tell-us"),
			write: () => {
				setRatings({ wroteAt: Date.now() });
				posthog.capture("rating_review_tapped");
				openReview();
			},
		},
		state: { rated },
	};
}
