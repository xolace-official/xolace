import type { ImportTarget } from "./types";

/**
 * What a dropped JSON file holds. Files are recognised by their records, not their
 * names, so a drop can be `exam-season-entries.json` as well as `manifest.json`.
 */
export type JsonRole =
	| "entries"
	| "sources"
	| "hubs"
	| "narration"
	| "tracks"
	| "topics";

interface RoleSpec {
	/**
	 * Keys every record of this role has; the first role whose keys all match wins.
	 * Only required fields: a copy edit may leave out an optional path such as
	 * `audioPath`, and compare checks the rest of each record.
	 */
	keys: readonly string[];
	label: string;
}

const ROLES: Record<JsonRole, RoleSpec> = {
	entries: {
		keys: ["slug", "kind", "title", "bodyPath"],
		label: "Entries",
	},
	hubs: {
		keys: ["slug", "title", "intro", "items"],
		label: "Hubs",
	},
	narration: {
		keys: ["entrySlug", "audioPath"],
		label: "Narration",
	},
	sources: {
		keys: ["slug", "name", "licence", "attributionText"],
		label: "Sources",
	},
	topics: {
		keys: ["slug"],
		label: "Topics",
	},
	tracks: {
		keys: ["slug", "title", "topic", "family"],
		label: "Tracks",
	},
};

/** Roles each target reads, most specific first (tracks before topics: a track has a `slug` too). */
export const TARGET_ROLES: Record<ImportTarget, readonly JsonRole[]> = {
	audio: ["tracks", "topics"],
	library: ["entries", "sources", "hubs", "narration"],
};

export const roleSpec = (role: JsonRole) => ROLES[role];

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/** The role of a parsed JSON value for this target, or null when it isn't one of its record lists. */
export function detectRole(
	target: ImportTarget,
	value: unknown
): JsonRole | null {
	if (!Array.isArray(value) || value.length === 0) {
		return null;
	}
	const records = value.filter(isRecord);
	if (records.length !== value.length) {
		return null;
	}
	return (
		TARGET_ROLES[target].find((role) =>
			records.every((record) => ROLES[role].keys.every((key) => key in record))
		) ?? null
	);
}

export type JsonDetection =
	| { file: File; records: Record<string, unknown>[]; role: JsonRole }
	| { file: File; problem: string; role: null };

/** Reads and sorts the dropped JSON files; markdown and media are matched later, by path. */
export async function detectJsonFiles(
	target: ImportTarget,
	files: readonly File[]
): Promise<JsonDetection[]> {
	const json = files.filter((file) =>
		file.name.toLowerCase().endsWith(".json")
	);
	return await Promise.all(
		json.map(async (file): Promise<JsonDetection> => {
			let value: unknown;
			try {
				value = JSON.parse(await file.text());
			} catch {
				return { file, problem: "Not valid JSON", role: null };
			}
			const role = detectRole(target, value);
			return role && Array.isArray(value)
				? { file, records: value.filter(isRecord), role }
				: { file, problem: "No records this target reads", role: null };
		})
	);
}
