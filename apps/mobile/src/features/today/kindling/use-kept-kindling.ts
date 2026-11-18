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

/**
 * The kindling Today draws: the server's, or, for this visit, its last snapshot once the
 * server closed it having been tended to its end, so the final tend celebrates instead of
 * the card vanishing (`keepKindling`). How it ended (`paths.getLatest`) is read only while
 * a kept kindling is open on screen and the server has none to draw, so Today holds no
 * extra subscription otherwise. A dev state passes `fixtureOutcome` and reads nothing.
 * Worked out during render.
 */
export function useKeptKindling(
	server: KindlingView | null | undefined,
	fixtureOutcome?: KindlingOutcome
): KindlingView | null | undefined {
	const focused = useIsFocused();
	const [kept, setKept] = useState<KeptKindling | null>(null);
	// `server` is null with no kindling to draw: none active, or one with no steps.
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
