// The quote backgrounds catalogue as it should be in every deployment (B18).
// `manifest.json` beside this file lists each background in the Background
// sheet's order; its position is its `order`. The upload script makes a
// deployment's `quote_backgrounds` match it, and the processing script names
// its outputs by these keys.
//
// Stills carry no hosted media: the app bundles them (Poster and Night are
// drawn in code). A loop's files sit in `media/` (gitignored), named by key:
// `<key>.mp4`, `<key>.webp` (first-frame poster) and, when it has sound,
// `<key>.m4a`.

export type Kind = "still" | "loop";
export type Ink = "light" | "dark";

export type ManifestEntry = {
	ink: Ink;
	key: string;
	kind: Kind;
	name: string;
	/** Xolace+ only. The tier can change here without an app release. */
	plus: boolean;
};

export const LOOP_FILES = {
	audio: { contentType: "audio/mp4", ext: "m4a" },
	poster: { contentType: "image/webp", ext: "webp" },
	video: { contentType: "video/mp4", ext: "mp4" },
} as const;

export type LoopFile = keyof typeof LOOP_FILES;

/** Every loop needs these to be shown; the sound is optional. */
export const REQUIRED_LOOP_FILES: readonly LoopFile[] = ["video", "poster"];

const KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const isEntry = (value: unknown): value is ManifestEntry =>
	isRecord(value) &&
	typeof value.key === "string" &&
	typeof value.name === "string" &&
	value.name.trim() !== "" &&
	(value.kind === "still" || value.kind === "loop") &&
	(value.ink === "light" || value.ink === "dark") &&
	typeof value.plus === "boolean";

/** The manifest's entries, or an error naming what's wrong with it. */
export function parseManifest(manifest: unknown): ManifestEntry[] {
	if (!(Array.isArray(manifest) && manifest.every(isEntry))) {
		throw new Error(
			"manifest.json must be a list of { key, name, kind, ink, plus }"
		);
	}
	const seen = new Set<string>();
	for (const { key } of manifest) {
		if (!KEY.test(key)) {
			throw new Error(`manifest: "${key}" isn't a kebab-case key`);
		}
		if (seen.has(key)) {
			throw new Error(`manifest: "${key}" is listed twice`);
		}
		seen.add(key);
	}
	if (!seen.has("poster")) {
		throw new Error("manifest: Poster is the default and must be listed");
	}
	return manifest;
}

/** `--only a,b`: those entries, or an error naming keys the manifest lacks. */
export function pick(
	manifest: readonly ManifestEntry[],
	only: readonly string[] | undefined
): ManifestEntry[] {
	if (!only) {
		return [...manifest];
	}
	const listed = new Set(manifest.map((e) => e.key));
	const unknown = only.filter((key) => !listed.has(key));
	if (unknown.length > 0) {
		throw new Error(`--only: not in the manifest: ${unknown.join(", ")}`);
	}
	return manifest.filter((e) => only.includes(e.key));
}
