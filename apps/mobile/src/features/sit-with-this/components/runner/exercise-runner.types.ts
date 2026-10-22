export type BreathPattern = 'physiological_sigh' | 'extended_exhale' | 'slow_exhale';

export type ExerciseStep = {
  order: number;
  content: string;
  defaultContent?: string;
  durationSeconds?: number;
  type: 'text' | 'timer' | 'prompt' | 'breath' | 'haptic' | 'private_prompt';
  breathPattern?: BreathPattern;
  breathCycles?: number;
  hapticIntensity?: 'light' | 'medium' | 'heavy';
  slotKeys?: string[];
  promptPlaceholder?: string;
  promptMaxSeconds?: number;
  syncToBreath?: boolean;
};

export type ExerciseData = {
  exercise: {
    _id: string;
    title: string;
    type: string;
    steps: ExerciseStep[];
    estimatedMinutes: number;
  };
  slots: Record<string, string>;
};

export type RunnerPhase =
  | { kind: 'pre_roll' }
  | { kind: 'playing'; beatIndex: number }
  | { kind: 'close'; doneEnabled: boolean }
  | { kind: 'done' };

export type RunnerAction =
  | { type: 'BEGIN' }
  | { type: 'BEAT_COMPLETE'; totalBeats: number }
  | { type: 'UNLOCK_DONE' }
  | { type: 'DONE' };
