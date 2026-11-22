import { api } from "@xolace/backend/api";
import type { Doc, Id } from "@xolace/backend/dataModel";
import { useQuery } from "convex/react";

export type SwapOptions = {
	reset: Doc<"exercises"> | null;
	nextBest: Doc<"exercises"> | null;
	ready: boolean;
};

export function useSwapOptions(sessionId: Id<"sessions"> | null): SwapOptions {
	const options = useQuery(
		api.exercises.getSwapOptions,
		sessionId ? { sessionId } : "skip"
	);
	const reset = useQuery(
		api.exercises.getById,
		options?.resetId ? { exerciseId: options.resetId } : "skip"
	);
	const nextBest = useQuery(
		api.exercises.getById,
		options?.nextBestId ? { exerciseId: options.nextBestId } : "skip"
	);
	const known = <T>(id: unknown, doc: T | undefined) =>
		id === null || doc !== undefined;
	return {
		nextBest: nextBest ?? null,
		ready:
			options !== undefined &&
			known(options.resetId, reset) &&
			known(options.nextBestId, nextBest),
		reset: reset ?? null,
	};
}
