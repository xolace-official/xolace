/**
 * The Steadiness card's read: Xolace+'s insights view, or the free one (production's
 * InsightsScreen does the same). Both take the hour as `now`: Convex never reruns a query as
 * time passes.
 */
import { api } from "@xolace/backend/api";
import { useEffect, useState } from "react";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import {
	type SteadinessCard,
	steadinessCard,
} from "@/features/you/home/steadiness/steadiness-model";
import { useStableQuery } from "@/lib/convex/use-stable-query";

const HOUR = 60 * 60 * 1000;
const hour = () => Math.floor(Date.now() / HOUR) * HOUR;

/** The current hour, ticking over on the hour. */
function useHour(): number {
	const [now, setNow] = useState(hour);
	useEffect(() => {
		const id = setTimeout(() => setNow(hour()), now + HOUR - Date.now());
		return () => clearTimeout(id);
	}, [now]);
	return now;
}

/** Undefined while it loads. */
export function useYouSteadiness(): SteadinessCard | undefined {
	const { isPlus } = usePlusEntitlement();
	const now = useHour();
	// Null until the server sees the entitlement (webhook lag) and after a lapse: the free view
	// covers both. Stable, so the hourly re-subscribe doesn't blank the card.
	const held = useStableQuery(
		api.compounding.insights.plusView,
		isPlus ? { now } : "skip"
	);
	const plus = isPlus ? held : undefined;
	const free = useStableQuery(
		api.compounding.insights.freeView,
		plus ? "skip" : { now }
	);
	const view = plus ?? free;
	return view ? steadinessCard(view, Boolean(plus), new Date(now)) : undefined;
}
