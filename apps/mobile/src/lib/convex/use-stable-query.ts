import { usePaginatedQuery, useQuery } from "convex/react";
import { useRef } from "react";

/** `useQuery` that holds the last data while new args load, so `&& data` guards don't unmount.
 * https://stack.convex.dev/help-my-app-is-overreacting */
export const useStableQuery = ((name, ...args) => {
	const result = useQuery(name, ...args);
	const stored = useRef(result);

	if (result !== undefined) {
		stored.current = result;
	}

	return stored.current;
}) as typeof useQuery;

/** `usePaginatedQuery` that holds the last page/status while a new first page loads, so the
 * list swaps in place instead of blanking. */
export const useStablePaginatedQuery = ((name, ...args) => {
	const result = usePaginatedQuery(name, ...args);
	const stored = useRef(result);

	// Hold the last settled result while a new first page loads after an arg
	// change; only overwrite once we're past the loading states.
	if (result.status !== "LoadingMore" && result.status !== "LoadingFirstPage") {
		stored.current = result;
	}

	// `isLoading` stays live: the held page/status masks the in-flight fetch,
	// and a list still needs to know when to show its footer spinner.
	return { ...stored.current, isLoading: result.isLoading };
}) as typeof usePaginatedQuery;
