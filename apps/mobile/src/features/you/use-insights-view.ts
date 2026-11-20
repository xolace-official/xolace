import { api } from "@xolace/backend/api";
import { useEffect, useState } from "react";
import type { PlusStatus } from "@/features/purchases/plus-status";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import {
	asksFreeView,
	type StView,
} from "@/features/you/steadiness/steadiness-model";
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
	status: PlusStatus;
	now: Date;
} {
	const { status } = usePlusEntitlement();
	const asksPlus = status === "plus";
	const now = useHour();
	const held = useStableQuery(
		api.compounding.insights.plusView,
		asksPlus ? { now } : "skip"
	);
	const plus = asksPlus ? held : undefined;
	const free = useStableQuery(
		api.compounding.insights.freeView,
		asksFreeView(status, plus) ? { now } : "skip"
	);
	return {
		now: new Date(now),
		plus: Boolean(plus),
		status,
		view: plus ?? free,
	};
}
