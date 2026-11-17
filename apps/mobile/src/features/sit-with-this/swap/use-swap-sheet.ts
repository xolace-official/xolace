import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useState } from "react";
import { toast } from "@/components/shared/toast";
import { usePathSession } from "@/lib/path-session/use-path-session";
import { COPY } from "../copy";
import { swapChoices, toExercise } from "../sit-model";
import type { SwapSheet } from "./swap-data";

/** The server's refusals that mean the sheet is out of date: close it and let the queries catch up. */
const STALE = ["Maximum swaps reached", "Exercise not allowed"];

/**
 * The swap sheet on Convex: production's `exercises.getSwapOptions` (reset and
 * the next best) and `exercises.recordSwap`, unchanged. The options' names and
 * lengths come from the catalogue (`exercises.getById`). A swap closes the
 * sheet; the exercise behind it restarts on the new one, as production's
 * remount did.
 */
export function useSwapSheetData(): SwapSheet {
	const router = useRouter();
	const posthog = usePostHog();
	const { session, sessionId } = usePathSession();
	const forSession = sessionId ? { sessionId } : "skip";
	const options = useQuery(api.exercises.getSwapOptions, forSession);
	const current = useQuery(api.exercises.getForSession, forSession);
	const reset = useQuery(
		api.exercises.getById,
		options?.resetId ? { exerciseId: options.resetId } : "skip"
	);
	const nextBest = useQuery(
		api.exercises.getById,
		options?.nextBestId ? { exerciseId: options.nextBestId } : "skip"
	);
	const recordSwap = useMutation(api.exercises.recordSwap);
	const [busy, setBusy] = useState(false);
	const slots = current?.slots ?? {};

	const pick = async (id: string) => {
		if (busy || !sessionId) {
			return;
		}
		setBusy(true);
		try {
			const result = await recordSwap({
				newExerciseId: id as Id<"exercises">,
				sessionId,
			});
			posthog.capture("exercise_swapped", { swaps_used: result.swapsUsed });
			router.back();
		} catch (err) {
			const msg = err instanceof Error ? err.message : "";
			if (STALE.some((s) => msg.includes(s))) {
				router.back();
				return;
			}
			toast(COPY.sheet.failed);
		} finally {
			setBusy(false);
		}
	};

	return {
		actions: {
			keepGoing: () => router.back(),
			pick: (id) => {
				pick(id);
			},
		},
		state: {
			busy,
			choices: swapChoices(
				{
					nextBest: nextBest ? toExercise(nextBest, slots) : null,
					reset: reset ? toExercise(reset, slots) : null,
				},
				current?.exercise.title ?? null
			),
			swaps: session?.swappedExerciseIds?.length ?? 0,
		},
	};
}
