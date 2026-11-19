import * as Sentry from "@sentry/react-native";
import { api } from "@xolace/backend/api";
import type { Id } from "@xolace/backend/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useIsFocused, useLocalSearchParams, useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef } from "react";
import { BackHandler } from "react-native";
import { useSessionMode } from "@/context/session-mode-context";
import { goHome } from "@/lib/landing";
import { useSessionEndHref } from "@/lib/path-session/session-end-href";
import { usePathSession } from "@/lib/path-session/use-path-session";
import { toExercise } from "./catalogue";
import type { Sit } from "./sit-data";
import { isStandalone, sitFrom, sitResult, sitSource } from "./sit-model";
import { useSwapOptions } from "./swap/use-swap-options";

/**
 * Sit with this on Convex: production's data flow, unchanged. From a
 * reflection, the session's exercise (matched or swapped) and its slots; the
 * path starts on arrival and completes before the session end opens. A
 * kindling twig (`from=kindling`) replays a completed session's exercise:
 * nothing in the session moves, finishing tends the twig, and it goes back.
 * Today's Sit door (`from=today`) plays Three breaths on its own
 * (`exercises.getStandalone`): no session, no slots, no swap; finishing it counts the day
 * (`exercises.completeStandalone`), and it goes back. A letter's care sheet (`from=letter`,
 * Breathe with me first) plays the same Three breaths the same way: it's the same exercise as
 * from Today, so finishing it counts the day too, and `sit_opened` / `sit_finished` carry
 * `from: "letter"`.
 * Nothing written in a prompt is ever sent.
 */
export function useSitData(): Sit {
	const router = useRouter();
	const params = useLocalSearchParams<{
		from?: string;
		sessionId?: string;
		stepId?: string;
	}>();
	const from = sitFrom(params.from);
	const standalone = isStandalone(from);
	const posthog = usePostHog();
	const stepId = params.stepId as Id<"path_steps"> | undefined;
	const pathSession = usePathSession();
	const { sessionId, standalone: standaloneTitle } = sitSource(from, {
		path: pathSession.sessionId,
		route: params.sessionId as Id<"sessions"> | undefined,
	});
	const { session, startPath, completePath } = pathSession;
	const forSession = useQuery(
		api.exercises.getForSession,
		sessionId ? { sessionId } : "skip"
	);
	const alone = useQuery(
		api.exercises.getStandalone,
		standaloneTitle ? { title: standaloneTitle } : "skip"
	);
	const result = sitResult(from, forSession, alone);
	const completeStep = useMutation(api.paths.completeStep);
	const completeStandalone = useMutation(api.exercises.completeStandalone);
	const afterPath = useSessionEndHref(standalone ? null : sessionId);
	const { isNight } = useSessionMode();
	const started = useRef(false);
	const announced = useRef(false);
	const begun = useRef(false);
	const leaving = useRef(false);
	const opening = useRef(false);
	const focused = useIsFocused();
	// Warm the sheet's options while the exercise plays (none for a kindling replay).
	useSwapOptions(standalone ? null : sessionId);

	// Back in front: "Something different" may open the sheet again.
	useEffect(() => {
		if (focused) {
			opening.current = false;
		}
	}, [focused]);

	// Once per visit, wherever it was opened from: the first screen is up.
	const exerciseTitle = result?.exercise.title;
	useEffect(() => {
		if (!exerciseTitle || announced.current) {
			return;
		}
		announced.current = true;
		posthog.capture("sit_opened", { exercise: exerciseTitle, from });
	}, [exerciseTitle, from, posthog]);

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
		// Only a run that had an exercise to play (not the empty or loading "Go back").
		if (exerciseTitle) {
			posthog.capture("sit_finished", {
				completed,
				exercise: exerciseTitle,
				from,
			});
		}
		if (standalone) {
			// Finishing tends the kindling twig; leaving early leaves it untouched.
			if (completed && stepId) {
				await completeStep({ stepId }).catch(() => undefined);
			}
			// From Today, a run to its end counts as a day showed up (the same credit as a
			// tended breathing twig). It never holds up the way back; a failure is reported.
			if (completed && standaloneTitle) {
				completeStandalone({ title: standaloneTitle }).catch((error) =>
					Sentry.captureException(error)
				);
			}
			// A deep link has no history to go back to: Reflect, the landing, instead.
			if (router.canGoBack()) {
				router.back();
			} else {
				goHome();
			}
			return;
		}
		await completePath(completed);
		router.replace(afterPath("solo"));
	};

	// Android's back button leaves as the close does (swipe back is off): the path and the
	// analytics see it, instead of the screen just popping.
	useEffect(() => {
		if (!focused) {
			return;
		}
		const sub = BackHandler.addEventListener("hardwareBackPress", () => {
			finish(false);
			return true;
		});
		return () => sub.remove();
	});

	let status: Sit["state"]["status"] = "ready";
	if (result === undefined || !(standalone || session)) {
		status = "loading";
	} else if (result === null) {
		status = "empty";
	}

	return {
		actions: {
			begin: () => {
				if (exerciseTitle && !begun.current) {
					begun.current = true;
					posthog.capture("sit_started", { exercise: exerciseTitle, from });
				}
			},
			finish: (completed) => {
				finish(completed);
			},
			openSwap: () => {
				// One sheet, however fast the taps.
				if (opening.current || !focused) {
					return;
				}
				opening.current = true;
				router.push("/sit-with-this-swap");
			},
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
