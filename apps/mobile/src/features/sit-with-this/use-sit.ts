import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { useSessionMode } from "@/context/session-mode-context";
import { useSessionEndHref } from "@/lib/path-session/session-end-href";
import { usePathSession } from "@/lib/path-session/use-path-session";
import type { Sit } from "./sit-data";
import { type SitFrom, toExercise } from "./sit-model";

/**
 * Sit with this on Convex: production's data flow, unchanged. From a
 * reflection, the session's exercise (matched or swapped) and its slots; the
 * path starts on arrival and completes before the session end opens. A
 * kindling twig (`from=kindling`) replays a completed session's exercise:
 * nothing in the session moves, finishing tends the twig, and it goes back.
 * Nothing written in a prompt is ever sent.
 */
export function useSitData(): Sit {
	const router = useRouter();
	const params = useLocalSearchParams<{
		from?: string;
		sessionId?: string;
		stepId?: string;
	}>();
	const from: SitFrom = params.from === "kindling" ? "kindling" : "reflect";
	const standalone = from === "kindling";
	const stepId = params.stepId as Id<"path_steps"> | undefined;
	const pathSession = usePathSession();
	const sessionId = standalone
		? ((params.sessionId as Id<"sessions"> | undefined) ?? null)
		: pathSession.sessionId;
	const { session, startPath, completePath } = pathSession;
	const result = useQuery(
		api.exercises.getForSession,
		sessionId ? { sessionId } : "skip"
	);
	const completeStep = useMutation(api.paths.completeStep);
	const afterPath = useSessionEndHref(standalone ? null : sessionId);
	const { isNight } = useSessionMode();
	const started = useRef(false);
	const leaving = useRef(false);

	useEffect(() => {
		if (standalone || started.current || !sessionId || !session) {
			return;
		}
		if (session.state === "path_selected") {
			startPath().then((ok) => {
				if (ok) {
					started.current = true;
				}
			});
		} else if (session.state === "path_in_progress") {
			started.current = true;
		}
	}, [standalone, sessionId, session, startPath]);

	// Complete the session before navigating, so it is terminal even if the app
	// closes on the session end, which fetches by id, not `getActive`.
	const finish = async (completed: boolean) => {
		if (leaving.current) {
			return;
		}
		leaving.current = true;
		if (standalone) {
			// Finishing tends the kindling twig; leaving early leaves it untouched.
			if (completed && stepId) {
				await completeStep({ stepId }).catch(() => undefined);
			}
			router.back();
			return;
		}
		await completePath(completed);
		router.replace(afterPath("solo"));
	};

	let status: Sit["state"]["status"] = "ready";
	if (result === undefined || !(standalone || session)) {
		status = "loading";
	} else if (result === null) {
		status = "empty";
	}

	return {
		actions: {
			finish: (completed) => {
				finish(completed);
			},
			openSwap: () => router.push("/sit-with-this-swap"),
		},
		state: {
			exercise: result ? toExercise(result.exercise, result.slots) : null,
			from,
			late: isNight,
			status,
			swaps: standalone ? 0 : (session?.swappedExerciseIds?.length ?? 0),
		},
	};
}
