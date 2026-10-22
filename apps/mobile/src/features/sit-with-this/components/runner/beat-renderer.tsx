import type { ExerciseStep } from './exercise-runner.types';
import { TextBeat } from './beats/text-beat';
import { BreathBeat } from './beats/breath-beat';
import { HapticBeat } from './beats/haptic-beat';
import { PrivatePromptBeat } from './beats/private-prompt-beat';

type Props = {
  step: ExerciseStep;
  slots: Record<string, string>;
  reducedMotion: boolean;
  onComplete: () => void;
};

function resolveContent(
  content: string,
  defaultContent: string | undefined,
  slotKeys: string[] | undefined,
  slots: Record<string, string>,
): string {
  if (!slotKeys || slotKeys.length === 0) return content;
  const allFilled = slotKeys.every((k) => slots[k] !== undefined);
  if (!allFilled) return defaultContent ?? content;
  return content.replace(/\{\{(\w+)\}\}/g, (_, k) => slots[k] ?? '');
}

export function BeatRenderer({ step, slots, reducedMotion, onComplete }: Props) {
  const content = resolveContent(step.content, step.defaultContent, step.slotKeys, slots);

  switch (step.type) {
    case 'text':
    case 'timer':
    case 'prompt':
      return (
        <TextBeat
          key={step.order}
          content={content}
          durationSeconds={step.durationSeconds ?? 8}
          onComplete={onComplete}
          syncToBreath={step.syncToBreath}
          breathPattern={step.breathPattern}
          breathCycles={step.breathCycles}
          reducedMotion={reducedMotion}
        />
      );

    case 'breath':
      return (
        <BreathBeat
          key={step.order}
          content={content}
          breathPattern={step.breathPattern ?? 'slow_exhale'}
          breathCycles={step.breathCycles ?? 1}
          reducedMotion={reducedMotion}
          onComplete={onComplete}
        />
      );

    case 'haptic':
      return (
        <HapticBeat
          key={step.order}
          content={content}
          fallbackContent={step.defaultContent}
          durationSeconds={step.durationSeconds ?? 6}
          hapticIntensity={step.hapticIntensity}
          reducedMotion={reducedMotion}
          onComplete={onComplete}
        />
      );

    case 'private_prompt':
      return (
        <PrivatePromptBeat
          key={step.order}
          content={content}
          placeholder={step.promptPlaceholder}
          onComplete={onComplete}
        />
      );

    default:
      return null;
  }
}
