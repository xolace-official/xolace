import { useIsFocused } from "expo-router";
import { useState } from "react";
import {
	type KeptKindling,
	type KindlingView,
	keepKindling,
} from "./kindling-model";

/**
 * The kindling Today draws: the server's, or, for this visit, its last snapshot once the
 * server closed it, so the final tend celebrates instead of the card vanishing
 * (`keepKindling`). Worked out during render.
 */
export function useKeptKindling(
	server: KindlingView | null | undefined
): KindlingView | null | undefined {
	const focused = useIsFocused();
	const [kept, setKept] = useState<KeptKindling | null>(null);
	const next = keepKindling(kept, server, focused);
	if (next !== undefined) {
		setKept(next);
	}
	const now = next === undefined ? kept : next;
	return server ?? now?.view ?? server;
}
