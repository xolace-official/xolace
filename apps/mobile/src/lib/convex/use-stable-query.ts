import { usePaginatedQuery, useQuery } from "convex/react";
import { useRef } from "react";

export const useStableQuery = ((name, ...args) => {
	const result = useQuery(name, ...args);
	const stored = useRef(result);

	if (result !== undefined) {
		stored.current = result;
	}

	return stored.current;
}) as typeof useQuery;

export const useStablePaginatedQuery = ((name, ...args) => {
	const result = usePaginatedQuery(name, ...args);
	const stored = useRef(result);

	if (result.status !== "LoadingMore" && result.status !== "LoadingFirstPage") {
		stored.current = result;
	}

	return { ...stored.current, isLoading: result.isLoading };
}) as typeof usePaginatedQuery;
