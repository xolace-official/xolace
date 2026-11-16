import type { DevState } from "@/dev/dev-state";

/** A feature's dev states, under the folder name its links use. */
export type DevFeature = {
	readonly feature: string;
	readonly states: readonly DevState[];
};

/** A discovered `dev/states.tsx`: its path under `src/features/` and its exports. */
export type StatesFile = { readonly path: string; readonly exports: unknown };

/** `./reach-me-on/dev/states.tsx`, or a big feature's `./letters/write/dev/states.tsx`:
 * both register under the feature folder (`reach-me-on`, `letters`). */
const STATES_FILE = /^(?:\.\/)?([^/]+)\/(?:[^/]+\/)*dev\/states\.tsx$/;
/** A link segment: lowercase words joined by hyphens. */
const SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isDevState(value: unknown): value is DevState {
	return (
		typeof value === "object" &&
		value !== null &&
		"id" in value &&
		typeof value.id === "string" &&
		"title" in value &&
		typeof value.title === "string" &&
		"Screen" in value &&
		typeof value.Screen === "function"
	);
}

/** The file's `devStates`, or undefined when it doesn't export a list of states. */
function statesOf(exports: unknown): readonly DevState[] | undefined {
	if (typeof exports !== "object" || exports === null) {
		return undefined;
	}
	const states: unknown = "devStates" in exports ? exports.devStates : null;
	return Array.isArray(states) && states.every(isDevState) ? states : undefined;
}

/**
 * The registry, from every feature's `dev/states.tsx`, sorted by feature. A file
 * that breaks the contract throws with its path and the fix, so the dev build
 * says what's wrong the first time anyone opens a state.
 */
export function devFeatures(files: readonly StatesFile[]): DevFeature[] {
	const byFeature = new Map<string, DevState[]>();
	for (const { path, exports } of files) {
		const feature = path.match(STATES_FILE)?.[1];
		if (!feature) {
			throw new Error(
				`${path}: dev states live in src/features/<feature>/dev/states.tsx`
			);
		}
		const states = statesOf(exports);
		if (!states) {
			throw new Error(
				`${path}: export \`devStates: readonly DevState[]\` (src/dev/dev-state.ts)`
			);
		}
		const listed = byFeature.get(feature) ?? [];
		for (const state of states) {
			if (!SEGMENT.test(state.id)) {
				throw new Error(`${path}: "${state.id}" isn't a kebab-case id`);
			}
			if (listed.some((s) => s.id === state.id)) {
				throw new Error(`${path}: ${feature} already has "${state.id}"`);
			}
			listed.push(state);
		}
		byFeature.set(feature, listed);
	}
	return [...byFeature]
		.map(([feature, states]) => ({ feature, states }))
		.sort((a, b) => a.feature.localeCompare(b.feature));
}

/** The state a link names (`/dev/<feature>/<id>`), if it's registered. */
export const findDevState = (
	features: readonly DevFeature[],
	feature: string,
	id: string
): DevState | undefined =>
	features.find((f) => f.feature === feature)?.states.find((s) => s.id === id);
