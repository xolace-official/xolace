import type { api } from "@xolace/backend/api";
import type { FunctionReturnType } from "convex/server";

// The admin's view of the meaning indexes (`api.admin.searchIndex`, ADR 0021):
// each namespace's active source rows against the keys embedded in it. Kindling
// binds audio, music, reads, try-this and xolacer suggestions on these, so an
// empty namespace means those suggestions bind on nothing.

export type IndexStatus = FunctionReturnType<
	typeof api.admin.searchIndex.status
>[number];
export type IndexName = IndexStatus["index"];
export type NamespaceStatus = IndexStatus["namespaces"][number];
export type MigrationStep = IndexStatus["migrations"][number];

export const INDEX_COPY: Record<
	IndexName,
	{ confirm: string; description: string; title: string }
> = {
	exercises: {
		confirm:
			"Re-embeds every active exercise and removes retired ones, in one job.",
		description: "Try-this exercises, keyed on the title.",
		title: "Exercises",
	},
	library: {
		confirm:
			"Re-runs the Library searchText backfill, then schedules one embed per active entry, spread over five minutes. Counts climb as they land.",
		description: "Library reads, keyed on the entry.",
		title: "Library",
	},
	tracks: {
		confirm:
			"Re-runs the track searchText backfill, then schedules one embed per active track, spread over five minutes. Counts climb as they land.",
		description:
			"Support audio and music, one namespace per topic plus the reframe series, keyed on the slug.",
		title: "Tracks",
	},
	xolacers: {
		confirm:
			"Re-embeds every complete, active xolacer with a bio and removes everyone else, in one job.",
		description: "Xolacer suggestions, keyed on the xolacer.",
		title: "Xolacers",
	},
};

/** What search can't find at all: active rows, and nothing embedded for them. */
export const isEmptyGap = (ns: NamespaceStatus) =>
	ns.source > 0 && ns.indexed === 0;

export const hasGap = (ns: NamespaceStatus) =>
	ns.missingCount > 0 || ns.staleCount > 0;

export type RunState = "idle" | "backfilling" | "embedding" | "failed";

/**
 * Backfilling while a migration step or job is running; embedding while the
 * index step's spread-out embeds may still be landing; failed when the last
 * run did.
 */
export function runState(status: IndexStatus, now: number): RunState {
	const { job, migrations, embedsUntil } = status;
	if (
		migrations.some((m) => m.state === "inProgress") ||
		job?.state === "pending" ||
		job?.state === "inProgress"
	) {
		return "backfilling";
	}
	if (migrations.some((m) => m.state === "failed") || job?.state === "failed") {
		return "failed";
	}
	if (embedsUntil !== undefined && now < embedsUntil) {
		return "embedding";
	}
	return "idle";
}

const MIGRATIONS_PREFIX = /^migrations:/;

/** "migrations:backfillTrackIndex" → "backfillTrackIndex". */
export const stepName = (step: MigrationStep) =>
	step.name.replace(MIGRATIONS_PREFIX, "");
