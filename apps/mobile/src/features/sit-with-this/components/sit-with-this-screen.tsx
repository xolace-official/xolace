import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { useToast } from "heroui-native";
import { api } from "@/convex/_generated/api";
import { usePathSession } from "@/src/features/sit-with-this/hooks/use-path-session";
import { useSessionEndHref } from "@/src/features/kindling/use-session-end-href";
import { usePostHog } from "posthog-react-native";
import { ExerciseRunner } from "./runner/exercise-runner";
import { SwapSheet } from "./swap-sheet";
import { AppText } from "@/src/components/shared/app-text";
import { useEffectiveReducedMotion } from "@/src/lib/motion/use-effective-reduced-motion";
import type { ExerciseData } from "./runner/exercise-runner.types";
import type { Id } from "@/convex/_generated/dataModel";

const styles = StyleSheet.create({
  insetsContainer: { paddingTop: 0, paddingBottom: 0 },
});

export function SitWithThisScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { toast } = useToast();
  const startedRef = useRef(false);
  const [swapSheetOpen, setSwapSheetOpen] = useState(false);
  const insetsStyle = [
    styles.insetsContainer,
    { paddingTop: insets.top, paddingBottom: insets.bottom },
  ];

  // A kindling twig (#333) replays a *completed* session's exercise: the
  // session id rides in on the route, no session state moves, and finishing
  // returns to the kindling instead of session-end.
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
    sessionId ? { sessionId } : "skip",
  );
  const swapOptions = useQuery(
    api.exercises.getSwapOptions,
    sessionId ? { sessionId } : "skip",
  );
  const preferences = useQuery(api.preferences.get);
  const reducedMotion = useEffectiveReducedMotion();
  const recordSwapMutation = useMutation(api.exercises.recordSwap);
  const completeStep = useMutation(api.paths.completeStep);
  const afterPath = useSessionEndHref(standalone ? null : sessionId);

  useEffect(() => {
    if (standalone || startedRef.current || !sessionId || !session) return;
    if (session.state === "path_selected") {
      const go = async () => {
        const ok = await startPath();
        if (ok) startedRef.current = true;
      };
      go();
    } else if (session.state === "path_in_progress") {
      startedRef.current = true;
    }
  }, [standalone, sessionId, session, startPath]);

  // Complete the session the moment the exercise ends — before navigating — so
  // it's durably terminal even if the user closes the app on session-end.
  // session-end fetches the session by id (not getActive), so it renders fine
  // on a completed session and only records optional post-session feedback.
  const goToSessionEnd = async (pathCompleted: boolean) => {
    if (standalone) {
      // Finishing tends the kindling twig; bailing early leaves it untouched.
      if (pathCompleted && stepId) await completeStep({ stepId }).catch(() => {});
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
    if (!sessionId) return;
    try {
      const result = await recordSwapMutation({ sessionId, newExerciseId });
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
        label: "Could not switch",
        description: "Try again in a moment.",
        variant: "default",
      });
    }
  };

  const handleOpenSwapSheet = () => {
    setSwapSheetOpen(true);
  };

  const exerciseData: ExerciseData | null = !exerciseResult ? null : {
    exercise: {
      _id: exerciseResult.exercise._id,
      title: exerciseResult.exercise.title,
      type: exerciseResult.exercise.type,
      steps: exerciseResult.exercise.steps,
      estimatedMinutes: exerciseResult.exercise.estimatedMinutes,
    },
    slots: exerciseResult.slots,
  };

  if (
    exerciseResult === undefined ||
    (!standalone && !session) ||
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
          className="text-center text-sm text-foreground/40"
          onPress={handleExitEarly}
        >
          Go back
        </AppText>
      </View>
    );
  }

  const swapsUsed = standalone ? 0 : (session?.swappedExerciseIds?.length ?? 0);
  // Derive from session: if any swaps have happened, skip pre-roll on remount.
  const hasSwapped = swapsUsed > 0;

  return (
    <View className="flex-1 bg-background" style={insetsStyle}>
      <ExerciseRunner
        key={exerciseData?.exercise._id}
        exercise={exerciseData!}
        reducedMotion={reducedMotion}
        showPreRoll={!hasSwapped}
        onComplete={handleComplete}
        onExitEarly={handleExitEarly}
        onSwap={!standalone && swapsUsed < 2 ? handleOpenSwapSheet : undefined}
      />

      <SwapSheet
        isOpen={swapSheetOpen}
        onOpenChange={setSwapSheetOpen}
        swapsUsed={swapsUsed}
        resetId={swapOptions?.resetId ?? null}
        nextBestId={swapOptions?.nextBestId ?? null}
        onKeepGoing={() => setSwapSheetOpen(false)}
        onSwap={handleSwap}
      />
    </View>
  );
}
