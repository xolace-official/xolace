import { COPY } from "./copy";
import type {
	Beat,
	BreathPattern,
	CatalogueExercise,
	CatalogueStep,
	Exercise,
	Slots,
} from "./sit-model";

const TEXT_DEFAULT_S = 8;
const HAND_DEFAULT_S = 6;
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

export function typeset(text: string): string {
	return text.replace(APOSTROPHE, "$1’$2").replace(QUOTED, "“$1”");
}

function toBeat(step: CatalogueStep, slots: Slots): Beat {
	const text = typeset(resolveContent(step, slots));
	const pat = PATTERN[step.breathPattern ?? "slow_exhale"];
	const cyc = step.breathCycles ?? BREATH_DEFAULT_CYCLES;
	switch (step.type) {
		case "breath": {
			const [inLine, outLine] = text.split("\n");
			const t = outLine === undefined ? text : ([inLine, outLine] as const);
			return { cyc, k: "breath", pat, t };
		}
		case "haptic":
			return {
				intensity: step.hapticIntensity ?? "medium",
				k: "haptic",
				s: Math.max(HAND_MIN_S, step.durationSeconds ?? HAND_DEFAULT_S),
				t: text || typeset(step.defaultContent ?? ""),
			};
		case "private_prompt":
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

export function toExercise(doc: CatalogueExercise, slots: Slots): Exercise {
	const steps = [...doc.steps].sort((a, b) => a.order - b.order);
	return {
		beats: withoutStayed(steps.map((s) => toBeat(s, slots))),
		id: doc.title,
		key: doc._id,
		name: exerciseName(doc.title),
	};
}
