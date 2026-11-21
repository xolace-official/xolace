import { api } from "@xolace/backend/api";
import { useQuery } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { useState } from "react";
import { Share } from "react-native";
import { toast } from "@/components/shared/toast";
import { COPY } from "@/features/achievements/copy";
import { shareBadgeCard } from "@/features/achievements/share/badge-card-file";
import {
	badgeCard,
	offeredName,
} from "@/features/achievements/share/badge-card-model";
import type { BadgeShare } from "@/features/achievements/share/badge-share-data";
import { useProfileSummary } from "@/lib/profile-summary";
import { useSingleFlight } from "@/lib/use-single-flight";

export function useBadgeShare(achievementId: string): BadgeShare {
	const raw = useQuery(api.achievements.display.get, { achievementId });
	const summary = useProfileSummary();
	const posthog = usePostHog();
	const [includeName, setIncludeName] = useState(false);
	const flight = useSingleFlight();
	const displayName = summary?.displayName;
	const card =
		raw === undefined
			? undefined
			: badgeCard(raw, { displayName, includeName });

	const shared = (as: "image" | "text") => {
		posthog.capture("badge_shared", {
			achievement_id: achievementId,
			as,
			with_name: card?.name !== null,
		});
	};

	// The image first; if it can't be made or the phone can't share a file, the old text.
	// Promise chains, not try/catch, so the React Compiler keeps this hook compiled.
	const share = () => {
		if (!card || flight.isBusy()) {
			return;
		}
		flight.run(() =>
			shareBadgeCard(card.message)
				.then(() => shared("image"))
				.catch((e: unknown) => {
					console.error("[achievements] badge card share failed", e);
					return Share.share({ message: card.message }).then((r) => {
						if (r.action === Share.sharedAction) {
							shared("text");
						}
					});
				})
				.catch(() => toast(COPY.card.cantMake, { variant: "warning" }))
		);
	};

	return {
		actions: { setIncludeName, share },
		state: {
			card,
			includeName,
			name: offeredName(displayName),
			sharing: flight.busy,
		},
	};
}
