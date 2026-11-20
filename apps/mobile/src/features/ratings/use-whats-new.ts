import { router, useLocalSearchParams } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useEffect } from "react";
import { useAppStore } from "@/store/store";
import { LATEST_RELEASE } from "./copy";
import { markSeen } from "./ratings-model";
import type { WhatsNew } from "./whats-new-data";

type Params = { next?: "rate" | "close" };

/**
 * What's New for the latest release. A plain open passes `?next=rate` when the rating screen is
 * due after it; from Settings it just closes. Opening it counts as seeing it, from anywhere.
 */
export function useWhatsNew(): WhatsNew {
	const { next } = useLocalSearchParams<Params>();
	const posthog = usePostHog();
	const entry = LATEST_RELEASE;

	useEffect(() => {
		const s = useAppStore.getState();
		const seen = markSeen(s.ratings.seen, entry.id);
		if (seen !== s.ratings.seen) {
			s.setRatings({ seen });
		}
		posthog.capture("whats_new_shown", {
			next: next ?? "close",
			release: entry.id,
		});
	}, [posthog, next, entry.id]);

	return {
		actions: {
			continue: () => {
				if (next === "rate") {
					router.push({
						params: { from: "whatsnew" },
						pathname: "/ratings/rate",
					});
				} else {
					router.back();
				}
			},
		},
		state: { entry },
	};
}
