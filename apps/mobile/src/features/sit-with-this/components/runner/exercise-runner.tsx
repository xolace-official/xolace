import { useEffect, useReducer } from 'react';
import { StyleSheet, View } from 'react-native';
import { EaseView } from 'react-native-ease/uniwind';
import { AppText } from '@/src/components/shared/app-text';
import { PillButton } from '@/src/components/shared/pill-button';
import { PreRollCard } from '@/src/features/sit-with-this/components/pre-roll-card';
import { BeatRenderer } from './beat-renderer';
import { runnerReducer } from './exercise-runner.reducer';
import type { ExerciseData, RunnerPhase } from './exercise-runner.types';

const EASING: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];
const EASE_FADE_INITIAL = { opacity: 0 };
const EASE_FADE_ANIMATE = { opacity: 1 };
const EASE_SWAP_TRANSITION = { type: 'timing' as const, duration: 600, delay: 3000, easing: EASING };
const EASE_CLOSE_TRANSITION = { type: 'timing' as const, duration: 600, easing: EASING };
const EASE_DONE_TRANSITION = { type: 'timing' as const, duration: 400, easing: EASING };
const EASE_LEAVE_TRANSITION = { type: 'timing' as const, duration: 400, delay: 400, easing: EASING };

type Props = {
  exercise: ExerciseData;
  reducedMotion: boolean;
  showPreRoll?: boolean;
  onComplete: () => Promise<void>;
  onExitEarly: () => Promise<void>;
  onSwap?: () => void;
};

export function ExerciseRunner({
  exercise,
  reducedMotion,
  showPreRoll = true,
  onComplete,
  onExitEarly,
  onSwap,
}: Props) {
  const steps = [...exercise.exercise.steps].sort((a, b) => a.order - b.order);
  const totalBeats = steps.length;

  const initialPhase: RunnerPhase = showPreRoll
    ? { kind: 'pre_roll' }
    : totalBeats === 0
      ? { kind: 'close', doneEnabled: false }
      : { kind: 'playing', beatIndex: 0 };

  const [phase, dispatch] = useReducer(runnerReducer, initialPhase);

  useEffect(() => {
    if (phase.kind === 'close' && !phase.doneEnabled) {
      const t = setTimeout(() => dispatch({ type: 'UNLOCK_DONE' }), 2000);
      return () => clearTimeout(t);
    }
  }, [phase]);

  useEffect(() => {
    if (phase.kind === 'playing' && !steps[phase.beatIndex]) {
      dispatch({ type: 'BEAT_COMPLETE', totalBeats });
    }
  }, [phase, steps, totalBeats]);

  useEffect(() => {
    if (phase.kind === 'done') {
      onComplete();
    }
    // onComplete is stable (wrapped in useCallback at call site)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.kind]);

  const handleBeatComplete = () => {
    dispatch({ type: 'BEAT_COMPLETE', totalBeats });
  };

  if (phase.kind === 'pre_roll') {
    return (
      <View className="flex-1">
        <PreRollCard onBegin={() => dispatch({ type: 'BEGIN' })} />
      </View>
    );
  }

  if (phase.kind === 'playing') {
    const step = steps[phase.beatIndex];
    if (!step) return null;
    return (
      <View className="flex-1 items-center justify-center">
        <BeatRenderer
          key={`beat-${phase.beatIndex}`}
          step={step}
          slots={exercise.slots}
          reducedMotion={reducedMotion}
          onComplete={handleBeatComplete}
        />
        {onSwap && (
          <EaseView
            initialAnimate={EASE_FADE_INITIAL}
            animate={EASE_FADE_ANIMATE}
            transition={EASE_SWAP_TRANSITION}
            className="absolute bottom-8"
          >
            <AppText
              className="text-center text-sm text-foreground/30"
              onPress={onSwap}
            >
              Something different
            </AppText>
          </EaseView>
        )}
      </View>
    );
  }

  if (phase.kind === 'close') {
    return (
      <EaseView
        initialAnimate={EASE_FADE_INITIAL}
        animate={EASE_FADE_ANIMATE}
        transition={EASE_CLOSE_TRANSITION}
        className="flex-1 items-center justify-center gap-8 px-8"
      >
        <AppText className="text-center text-2xl font-semibold text-foreground">
          You stayed.
        </AppText>
        {phase.doneEnabled ? (
          <EaseView
            initialAnimate={EASE_FADE_INITIAL}
            animate={EASE_FADE_ANIMATE}
            transition={EASE_DONE_TRANSITION}
          >
            <PillButton label="Done" onPress={() => dispatch({ type: 'DONE' })} />
          </EaseView>
        ) : (
          <View style={styles.invisible}>
            <PillButton label="Done" onPress={() => {}} disabled />
          </View>
        )}
        <EaseView
          initialAnimate={EASE_FADE_INITIAL}
          animate={EASE_FADE_ANIMATE}
          transition={EASE_LEAVE_TRANSITION}
        >
          <AppText
            className="text-center text-sm text-foreground/40"
            onPress={onExitEarly}
          >
            Leave early
          </AppText>
        </EaseView>
      </EaseView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  invisible: { opacity: 0 },
});
