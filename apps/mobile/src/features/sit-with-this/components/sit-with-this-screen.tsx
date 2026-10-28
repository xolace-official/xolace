import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useToast } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { useSessionEndHref } from "@/features/kindling/use-session-end-href";
import { usePathSession } from "@/features/sit-with-this/hooks/use-path-session";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { ExerciseRunner } from "./runner/exercise-runner";
import type { ExerciseData } from "./runner/exercise-runner.types";
import { SwapSheet } from "./swap-sheet";

const styles = StyleSheet.create({
	insetsContainer: { paddingBottom: 0, paddingTop: 0 },
});

export function SitWithThisScreen() {
	const insets = useSafeAreaInsets();
	const router = useRouter();
	const { toast } = useToast();
	const startedRef = useRef(false);
	const [swapSheetOpen, setSwapSheetOpen] = useState(false);
	const insetsStyle = [
		styles.insetsContainer,
		{ paddingBottom: insets.bottom, paddingTop: insets.top },
	];

	// A kindling twig (#333) replays a completed session's exercise: no session
	// state moves, and finishing returns to the kindling instead of session-end.
	const params = useLocalSearchParams<{
		from?: string;
		sessionId?: string;
		stepId?: string;
	}>();
	const standalone = params.from === "kindling";
	const stepId = params.stepId as Id<"path_steps"> | undefined;
	const pathSession = usePathSession();
	const sessionId = standalone
		? ((params.sessionId as Id<"sessions"> | undefined) ?? null)
		: pathSession.sessionId;
	const { session, startPath, completePath } = pathSession;
	const posthog = usePostHog();
	const exerciseResult = useQuery(
		api.exercises.getForSession,
		sessionId ? { sessionId } : "skip"
	);
	const swapOptions = useQuery(
		api.exercises.getSwapOptions,
		sessionId ? { sessionId } : "skip"
	);
	const preferences = useQuery(api.preferences.get);
	const reducedMotion = useEffectiveReducedMotion();
	const recordSwapMutation = useMutation(api.exercises.recordSwap);
	const completeStep = useMutation(api.paths.completeStep);
	const afterPath = useSessionEndHref(standalone ? null : sessionId);

	useEffect(() => {
		if (standalone || startedRef.current || !sessionId || !session) {
			return;
		}
		if (session.state === "path_selected") {
			const go = async () => {
				const ok = await startPath();
				if (ok) {
					startedRef.current = true;
				}
			};
			go();
		} else if (session.state === "path_in_progress") {
			startedRef.current = true;
		}
	}, [standalone, sessionId, session, startPath]);

	// Complete the session before navigating, so it is terminal even if the app
	// closes on session-end. session-end fetches by id, not getActive.
	const goToSessionEnd = async (pathCompleted: boolean) => {
		if (standalone) {
			// Finishing tends the kindling twig; bailing early leaves it untouched.
			if (pathCompleted && stepId) {
				await completeStep({ stepId }).catch(() => {});
			}
			router.back();
			return;
		}
		await completePath(pathCompleted);
		router.replace(afterPath("solo"));
	};

	const handleComplete = async () => {
		await goToSessionEnd(true);
	};

	const handleExitEarly = async () => {
		await goToSessionEnd(false);
	};

	const handleSwap = async (newExerciseId: Id<"exercises">) => {
		if (!sessionId) {
			return;
		}
		try {
			const result = await recordSwapMutation({ newExerciseId, sessionId });
			posthog.capture("exercise_swapped", {
				swaps_used: result.swapsUsed,
			});
			setSwapSheetOpen(false);
		} catch (err) {
			const msg = err instanceof Error ? err.message : "";
			// Server-state mismatches: close sheet and let queries re-render.
			if (
				msg.includes("Maximum swaps reached") ||
				msg.includes("Exercise not allowed")
			) {
				setSwapSheetOpen(false);
				return;
			}
			toast.show({
				description: "Try again in a moment.",
				label: "Could not switch",
				variant: "default",
			});
		}
	};

	const handleOpenSwapSheet = () => {
		setSwapSheetOpen(true);
	};

	const exerciseData: ExerciseData | null = exerciseResult
		? {
				exercise: {
					_id: exerciseResult.exercise._id,
					estimatedMinutes: exerciseResult.exercise.estimatedMinutes,
					steps: exerciseResult.exercise.steps,
					title: exerciseResult.exercise.title,
					type: exerciseResult.exercise.type,
				},
				slots: exerciseResult.slots,
			}
		: null;

	if (
		exerciseResult === undefined ||
		!(standalone || session) ||
		preferences === undefined
	) {
		return (
			<View
				className="flex-1 items-center justify-center bg-background"
				style={insetsStyle}
			>
				<AppText className="text-center text-base text-foreground/40">
					Getting ready…
				</AppText>
			</View>
		);
	}

	if (exerciseResult === null) {
		return (
			<View
				className="flex-1 items-center justify-center gap-8 bg-background px-8"
				style={insetsStyle}
			>
				<AppText className="text-center text-base text-foreground/65">
					No exercise available right now.
				</AppText>
				<AppText
					className="text-center text-foreground/40 text-sm"
					onPress={handleExitEarly}
				>
					Go back
				</AppText>
			</View>
		);
	}

	const swapsUsed = standalone ? 0 : (session?.swappedExerciseIds?.length ?? 0);
	// Any swap so far skips the pre-roll on remount.
	const hasSwapped = swapsUsed > 0;

	return (
		<View className="flex-1 bg-background" style={insetsStyle}>
			<ExerciseRunner
				exercise={exerciseData!}
				key={exerciseData?.exercise._id}
				onComplete={handleComplete}
				onExitEarly={handleExitEarly}
				onSwap={!standalone && swapsUsed < 2 ? handleOpenSwapSheet : undefined}
				reducedMotion={reducedMotion}
				showPreRoll={!hasSwapped}
			/>

			<SwapSheet
				isOpen={swapSheetOpen}
				nextBestId={swapOptions?.nextBestId ?? null}
				onKeepGoing={() => setSwapSheetOpen(false)}
				onOpenChange={setSwapSheetOpen}
				onSwap={handleSwap}
				resetId={swapOptions?.resetId ?? null}
				swapsUsed={swapsUsed}
			/>
		</View>
	);
}
