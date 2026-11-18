import { api } from "@xolace/backend/api";
import { useMutation } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { useState } from "react";
import { toast } from "@/components/shared/toast";
import { useFullContext } from "@/lib/convex/use-full-context";
import { COPY } from "../copy";
import type { Today } from "../today-data";
import { keptExpiry, rekindleOffer, runRekindle } from "./rekindle-model";

/**
 * Production's streak revive (#437), on Today's streak surface: the offer from
 * `getFullContext`, one saver spent through `streaks.revive.revive`, and `streak_rekindled`.
 */
export function useRekindle(): {
	offer: Today["state"]["rekindle"];
	rekindle: () => Promise<void>;
} {
	const context = useFullContext();
	const revive = useMutation(api.streaks.revive.revive);
	const posthog = usePostHog();
	const [expired, setExpired] = useState<number>();
	const [busy, setBusy] = useState(false);
	const reviveStreak = context?.reviveStreak;
	const kept = keptExpiry(reviveStreak, expired);
	if (kept !== expired) {
		setExpired(kept);
	}
	const offer = rekindleOffer(reviveStreak, kept);

	const rekindle = async () => {
		if (offer === null || busy) {
			return;
		}
		setBusy(true);
		const result = await runRekindle(revive);
		setBusy(false);
		if (result.ok) {
			posthog.capture("streak_rekindled", { day: result.day });
		} else if (result.failure === "gone") {
			setExpired(offer);
			toast(COPY.rekindle.gone);
		} else {
			toast(COPY.rekindle.failed, { variant: "danger" });
		}
	};

	return { offer: offer === null ? null : { busy, streak: offer }, rekindle };
}
