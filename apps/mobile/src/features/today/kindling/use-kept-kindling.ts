import { api } from "@xolace/backend/api";
import { useQuery } from "convex/react";
import { useIsFocused } from "expo-router";
import { useState } from "react";
import {
	type KeptKindling,
	type KindlingOutcome,
	type KindlingView,
	keepKindling,
	kindlingOutcome,
} from "./kindling-model";

export function useKeptKindling(
	server: KindlingView | null | undefined,
	fixtureOutcome?: KindlingOutcome
): KindlingView | null | undefined {
	const focused = useIsFocused();
	const [kept, setKept] = useState<KeptKindling | null>(null);
	const waiting = kept !== null && !kept.closed && server === null;
	const latest = useQuery(
		api.paths.getLatest,
		waiting && fixtureOutcome === undefined ? {} : "skip"
	);
	let outcome: KindlingOutcome | undefined;
	if (waiting) {
		outcome =
			fixtureOutcome === undefined
				? latest === undefined
					? undefined
					: kindlingOutcome(latest)
				: fixtureOutcome;
	}
	const next = keepKindling(kept, server, outcome, focused);
	if (next !== undefined) {
		setKept(next);
	}
	const now = next === undefined ? kept : next;
	return server ?? now?.view ?? server;
}
