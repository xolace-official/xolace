import { BreathBeat } from "./beats/breath-beat";
import { HapticBeat } from "./beats/haptic-beat";
import { PrivatePromptBeat } from "./beats/private-prompt-beat";
import { TextBeat } from "./beats/text-beat";
import type { ExerciseStep } from "./exercise-runner.types";

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
	slots: Record<string, string>
): string {
	if (!slotKeys || slotKeys.length === 0) {
		return content;
	}
	const allFilled = slotKeys.every((k) => slots[k] !== undefined);
	if (!allFilled) {
		return defaultContent ?? content;
	}
	return content.replace(/\{\{(\w+)\}\}/g, (_, k) => slots[k] ?? "");
}

export function BeatRenderer({
	step,
	slots,
	reducedMotion,
	onComplete,
}: Props) {
	const content = resolveContent(
		step.content,
		step.defaultContent,
		step.slotKeys,
		slots
	);

	switch (step.type) {
		case "text":
		case "timer":
		case "prompt":
			return (
				<TextBeat
					breathCycles={step.breathCycles}
					breathPattern={step.breathPattern}
					content={content}
					durationSeconds={step.durationSeconds ?? 8}
					key={step.order}
					onComplete={onComplete}
					reducedMotion={reducedMotion}
					syncToBreath={step.syncToBreath}
				/>
			);

		case "breath":
			return (
				<BreathBeat
					breathCycles={step.breathCycles ?? 1}
					breathPattern={step.breathPattern ?? "slow_exhale"}
					content={content}
					key={step.order}
					onComplete={onComplete}
					reducedMotion={reducedMotion}
				/>
			);

		case "haptic":
			return (
				<HapticBeat
					content={content}
					durationSeconds={step.durationSeconds ?? 6}
					fallbackContent={step.defaultContent}
					hapticIntensity={step.hapticIntensity}
					key={step.order}
					onComplete={onComplete}
					reducedMotion={reducedMotion}
				/>
			);

		case "private_prompt":
			return (
				<PrivatePromptBeat
					content={content}
					key={step.order}
					onComplete={onComplete}
					placeholder={step.promptPlaceholder}
				/>
			);

		default:
			return null;
	}
}
