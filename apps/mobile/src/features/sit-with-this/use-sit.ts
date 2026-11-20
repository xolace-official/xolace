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
	useSwapOptions(standalone ? null : sessionId);

	useEffect(() => {
		if (focused) {
			opening.current = false;
		}
	}, [focused]);

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

	const finish = async (completed: boolean) => {
		if (leaving.current) {
			return;
		}
		leaving.current = true;
		if (exerciseTitle) {
			posthog.capture("sit_finished", {
				completed,
				exercise: exerciseTitle,
				from,
			});
		}
		if (standalone) {
			if (completed && stepId) {
				await completeStep({ stepId }).catch(() => undefined);
			}
			if (completed && standaloneTitle) {
				completeStandalone({ title: standaloneTitle }).catch((error) =>
					Sentry.captureException(error)
				);
			}
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
