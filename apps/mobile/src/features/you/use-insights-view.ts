/**
 * `compounding.insights`, Xolace+'s view or the free one, as production's InsightsScreen read it:
 * You's Steadiness card and the Steadiness screen both read it here. Both views take the hour
 * as `now`: Convex never reruns a query as time passes.
 */
import { api } from "@xolace/backend/api";
import { useEffect, useState } from "react";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import type { StView } from "@/features/you/steadiness/steadiness-model";
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

/**
 * `view` is undefined while it loads. `plus`: the server's Xolace+ view (numbers). `isPlus` and
 * `isResolved`: the store's answer, which leads the server's right after a purchase (webhook lag).
 */
export function useInsightsView(): {
	view: StView | undefined;
	plus: boolean;
	isPlus: boolean;
	isResolved: boolean;
	now: Date;
} {
	const { isPlus, isResolved } = usePlusEntitlement();
	const now = useHour();
	// Null until the server sees the entitlement (webhook lag) and after a lapse: the free view
	// covers both. Stable, so the hourly re-subscribe doesn't blank anything.
	const held = useStableQuery(
		api.compounding.insights.plusView,
		isPlus ? { now } : "skip"
	);
	const plus = isPlus ? held : undefined;
	const free = useStableQuery(
		api.compounding.insights.freeView,
		plus ? "skip" : { now }
	);
	return {
		isPlus,
		isResolved,
		now: new Date(now),
		plus: Boolean(plus),
		view: plus ?? free,
	};
}
