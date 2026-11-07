// The approved badge art (#690, #691): `manifest.json` beside this file
// records, per artKey, the source PNG in `media/` and the ElevenLabs
// generation Nathaniel approved in the canvas, so any image can be traced
// back to (and re-downloaded from) its generation.

import { UPLOADABLE_ART_KEYS } from "../../convex/achievements/catalog";

export type ManifestEntry = {
	artKey: string;
	/** The approved generation in the ElevenLabs badge flow. */
	generationId: string;
	/** The 2K PNG in `media/`; streak rungs of one stage share it. */
	source: string;
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const isFilled = (value: unknown): value is string =>
	typeof value === "string" && value !== "";

const isEntry = (value: unknown): value is ManifestEntry =>
	isRecord(value) &&
	typeof value.artKey === "string" &&
	isFilled(value.generationId) &&
	isFilled(value.source);

/** The manifest's entries, or an error naming what's wrong with it. */
export function parseManifest(manifest: unknown): ManifestEntry[] {
	if (!(Array.isArray(manifest) && manifest.every(isEntry))) {
		throw new Error(
			"manifest.json must be a list of { artKey, source, generationId }"
		);
	}
	const seen = new Set<string>();
	for (const { artKey } of manifest) {
		if (!UPLOADABLE_ART_KEYS.has(artKey)) {
			throw new Error(`manifest: "${artKey}" isn't a badge artKey`);
		}
		if (seen.has(artKey)) {
			throw new Error(`manifest: "${artKey}" is listed twice`);
		}
		seen.add(artKey);
	}
	return manifest;
}
