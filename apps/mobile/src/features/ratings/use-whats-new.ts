import { router, useLocalSearchParams } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useEffect } from "react";
import { LATEST_RELEASE } from "@/lib/release-notes";
import { useAppStore } from "@/store/store";
import { markSeen } from "./ratings-model";
import type { WhatsNew } from "./whats-new-data";

type Params = { next?: "rate" | "close" };

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
