import type { DevState } from "@/dev/dev-state";

export type DevFeature = {
	readonly feature: string;
	readonly states: readonly DevState[];
};

export type StatesFile = { readonly path: string; readonly exports: unknown };

export type DevProblem = { readonly path: string; readonly message: string };

export type DevRegistry = {
	readonly features: readonly DevFeature[];
	readonly problems: readonly DevProblem[];
};

const STATES_FILE = /^(?:\.\/)?([^/]+)\/(?:[^/]+\/)*dev\/states\.tsx$/;
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

function statesOf(exports: unknown): readonly DevState[] | undefined {
	if (typeof exports !== "object" || exports === null) {
		return undefined;
	}
	const states: unknown = "devStates" in exports ? exports.devStates : null;
	return Array.isArray(states) && states.every(isDevState) ? states : undefined;
}

export function devRegistry(files: readonly StatesFile[]): DevRegistry {
	const byFeature = new Map<string, DevState[]>();
	const problems: DevProblem[] = [];
	for (const { path, exports } of files) {
		const feature = path.match(STATES_FILE)?.[1];
		const states = statesOf(exports);
		if (!feature) {
			problems.push({
				message: "dev states live in src/features/<feature>/dev/states.tsx",
				path,
			});
			continue;
		}
		if (!states) {
			problems.push({
				message:
					"export `devStates: readonly DevState[]` (src/dev/dev-state.ts)",
				path,
			});
			continue;
		}
		const listed = byFeature.get(feature) ?? [];
		for (const state of states) {
			if (!SEGMENT.test(state.id)) {
				problems.push({ message: `"${state.id}" isn't a kebab-case id`, path });
			} else if (listed.some((s) => s.id === state.id)) {
				problems.push({
					message: `${feature} already has "${state.id}"`,
					path,
				});
			} else {
				listed.push(state);
			}
		}
		byFeature.set(feature, listed);
	}
	const features = [...byFeature]
		.map(([feature, states]) => ({ feature, states }))
		.sort((a, b) => a.feature.localeCompare(b.feature));
	return { features, problems };
}

export const findDevState = (
	features: readonly DevFeature[],
	feature: string,
	id: string
): DevState | undefined =>
	features.find((f) => f.feature === feature)?.states.find((s) => s.id === id);
