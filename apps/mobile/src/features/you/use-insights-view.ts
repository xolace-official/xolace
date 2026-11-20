import { api } from "@xolace/backend/api";
import { useEffect, useState } from "react";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import type { StView } from "@/features/you/steadiness/steadiness-model";
import { useStableQuery } from "@/lib/convex/use-stable-query";

const HOUR = 60 * 60 * 1000;
const hour = () => Math.floor(Date.now() / HOUR) * HOUR;

function useHour(): number {
	const [now, setNow] = useState(hour);
	useEffect(() => {
		const id = setTimeout(() => setNow(hour()), now + HOUR - Date.now());
		return () => clearTimeout(id);
	}, [now]);
	return now;
}

export function useInsightsView(): {
	view: StView | undefined;
	plus: boolean;
	isPlus: boolean;
	isResolved: boolean;
	now: Date;
} {
	const { isPlus, isResolved } = usePlusEntitlement();
	const now = useHour();
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
