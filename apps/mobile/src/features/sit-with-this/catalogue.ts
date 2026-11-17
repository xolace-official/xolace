/**
 * The catalogue's steps (`exercises.getForSession`) as the beats the screen
 * plays (design/handoff/sit.md §3, §6, the board's `EX`): production's slot
 * fill, then only the presentation fixes. Pure.
 */
import { COPY } from "./copy";
import type {
	Beat,
	BreathPattern,
	CatalogueExercise,
	CatalogueStep,
	Exercise,
	Slots,
} from "./sit-model";

/** Production's defaults when a step leaves them out (the old `beat-renderer.tsx`). */
const TEXT_DEFAULT_S = 8;
const HAND_DEFAULT_S = 6;
/** A hand pulse lasts long enough to feel two pulses (board `EX`: 6 s). */
const HAND_MIN_S = 6;
const BREATH_DEFAULT_CYCLES = 1;

const PATTERN: Record<
	NonNullable<CatalogueStep["breathPattern"]>,
	BreathPattern
> = {
	extended_exhale: "ext",
	physiological_sigh: "sigh",
	slow_exhale: "slow",
};

const SLOT = /\{\{(\w+)\}\}/g;

/** Production's slot fill: every slot filled, or the step's default copy. */
export function resolveContent(step: CatalogueStep, slots: Slots): string {
	const keys = step.slotKeys ?? [];
	if (keys.length === 0) {
		return step.content;
	}
	if (!keys.every((k) => slots[k] !== undefined)) {
		return step.defaultContent ?? step.content;
	}
	return step.content.replace(SLOT, (_, k: string) => slots[k] ?? "");
}

const APOSTROPHE = /(\w)'(\w)/g;
const QUOTED = /'([^']+)'/g;

/** The catalogue's straight quotes, typeset: ’ in a word, “…” around a phrase. */
export function typeset(text: string): string {
	return text.replace(APOSTROPHE, "$1’$2").replace(QUOTED, "“$1”");
}

/** One step as a beat. Mirror lines come from the user's own mirror. */
function toBeat(step: CatalogueStep, slots: Slots): Beat {
	const text = typeset(resolveContent(step, slots));
	const pat = PATTERN[step.breathPattern ?? "slow_exhale"];
	const cyc = step.breathCycles ?? BREATH_DEFAULT_CYCLES;
	switch (step.type) {
		case "breath": {
			// fix: one line per phase (Make room's in-line, then its out-line).
			const [inLine, outLine] = text.split("\n");
			const t = outLine === undefined ? text : ([inLine, outLine] as const);
			return { cyc, k: "breath", pat, t };
		}
		case "haptic":
			return {
				intensity: step.hapticIntensity ?? "medium",
				// fix: always says it.
				k: "haptic",
				s: Math.max(HAND_MIN_S, step.durationSeconds ?? HAND_DEFAULT_S),
				t: text || typeset(step.defaultContent ?? ""),
			};
		case "private_prompt":
			// fix: the question is the heading; the privacy line is said once, truthfully.
			return { k: "prompt", t: typeset(step.promptPlaceholder ?? text) };
		default: {
			if (step.syncToBreath) {
				return { cyc, k: "sync", pat, t: text };
			}
			const mirror =
				step.slotKeys?.includes("mirror_line") === true &&
				slots.mirror_line !== undefined;
			return {
				k: mirror ? "mirror" : "text",
				s: step.durationSeconds ?? TEXT_DEFAULT_S,
				t: text,
			};
		}
	}
}

/**
 * fix: the end screen says "You stayed.", so the last beat doesn't say it too
 * (Make room, Speak to it; Soften toward it's "That was kind. You stayed.").
 */
function withoutStayed(beats: Beat[]): Beat[] {
	const last = beats.at(-1);
	if (!last || (last.k !== "text" && last.k !== "mirror")) {
		return beats;
	}
	const stayed = COPY.stayed.title;
	if (!last.t.endsWith(stayed)) {
		return beats;
	}
	const rest = last.t.slice(0, -stayed.length).trim();
	return rest
		? [...beats.slice(0, -1), { ...last, t: rest }]
		: beats.slice(0, -1);
}

const exerciseName = (id: string) => COPY.names[id] ?? COPY.unnamed;

/** The catalogue entry and its slots, as the exercise the screen plays. */
export function toExercise(doc: CatalogueExercise, slots: Slots): Exercise {
	const steps = [...doc.steps].sort((a, b) => a.order - b.order);
	return {
		beats: withoutStayed(steps.map((s) => toBeat(s, slots))),
		id: doc.title,
		key: doc._id,
		name: exerciseName(doc.title),
	};
}
