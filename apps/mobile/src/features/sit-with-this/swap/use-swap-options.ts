import { api } from "@xolace/backend/api";
import type { Doc, Id } from "@xolace/backend/dataModel";
import { useQuery } from "convex/react";

export type SwapOptions = {
	reset: Doc<"exercises"> | null;
	nextBest: Doc<"exercises"> | null;
	/** Both options are known (each found, or there is none). */
	ready: boolean;
};

/**
 * The swap's two options (`exercises.getSwapOptions`) and their catalogue
 * entries (`exercises.getById`). Sit subscribes while it plays, so the sheet
 * opens on warm results and measures itself with its options in place, as
 * production's screen subscribed on mount; the sheet reads the same queries.
 */
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
