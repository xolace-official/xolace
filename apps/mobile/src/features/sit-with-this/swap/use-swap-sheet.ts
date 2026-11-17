import { api } from "@xolace/backend/api";
import type { Id } from "@xolace/backend/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useNavigation } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useRef, useState } from "react";
import { toast } from "@/components/shared/toast";
import { usePathSession } from "@/lib/path-session/use-path-session";
import { toExercise } from "../catalogue";
import { COPY } from "../copy";
import { swapChoices } from "../sit-model";
import type { SwapSheet } from "./swap-data";
import { useSwapOptions } from "./use-swap-options";

/** The server's refusals that mean the sheet is out of date: close it and let the queries catch up. */
const STALE = ["Maximum swaps reached", "Exercise not allowed"];

/**
 * The swap sheet on Convex: production's `exercises.getSwapOptions` (reset and
 * the next best) and `exercises.recordSwap`, unchanged; the options' names and
 * lengths from the catalogue (`use-swap-options.ts`, warm from Sit). A swap
 * closes the sheet and the exercise behind it restarts on the new one, as
 * production's remount did. The sheet only ever closes itself, once: a second
 * tap, or a save landing after a swipe-down, never pops Sit.
 */
export function useSwapSheetData(): SwapSheet {
	const navigation = useNavigation();
	const posthog = usePostHog();
	const { session, sessionId } = usePathSession();
	const current = useQuery(
		api.exercises.getForSession,
		sessionId ? { sessionId } : "skip"
	);
	const { reset, nextBest, ready } = useSwapOptions(sessionId);
	const recordSwap = useMutation(api.exercises.recordSwap);
	const [busy, setBusy] = useState(false);
	const closed = useRef(false);
	const slots = current?.slots ?? {};

	const close = () => {
		if (closed.current || !navigation.isFocused()) {
			return;
		}
		closed.current = true;
		navigation.goBack();
	};

	const pick = async (id: string) => {
		if (busy || closed.current || !sessionId) {
			return;
		}
		setBusy(true);
		try {
			const result = await recordSwap({
				newExerciseId: id as Id<"exercises">,
				sessionId,
			});
			posthog.capture("exercise_swapped", { swaps_used: result.swapsUsed });
			close();
		} catch (err) {
			const msg = err instanceof Error ? err.message : "";
			if (STALE.some((s) => msg.includes(s))) {
				close();
				return;
			}
			toast(COPY.sheet.failed);
		} finally {
			setBusy(false);
		}
	};

	return {
		actions: {
			keepGoing: close,
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
			loading: !(ready && current !== undefined),
			swaps: session?.swappedExerciseIds?.length ?? 0,
		},
	};
}
