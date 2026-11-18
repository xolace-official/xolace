import { useIsFocused } from "expo-router";
import { useState } from "react";
import {
	type KeptKindling,
	type KindlingOutcome,
	type KindlingView,
	keepKindling,
} from "./kindling-model";

/**
 * The kindling Today draws: the server's, or, for this visit, its last snapshot once the
 * server closed it having been tended to its end, so the final tend celebrates instead of
 * the card vanishing (`keepKindling`). `outcome` is how the latest kindling ended, read only
 * while the server has none. Worked out during render.
 */
export function useKeptKindling(
	server: KindlingView | null | undefined,
	outcome: KindlingOutcome | undefined
): KindlingView | null | undefined {
	const focused = useIsFocused();
	const [kept, setKept] = useState<KeptKindling | null>(null);
	const next = keepKindling(kept, server, outcome, focused);
	if (next !== undefined) {
		setKept(next);
	}
	const now = next === undefined ? kept : next;
	return server ?? now?.view ?? server;
}
