import type { api } from "@xolace/backend/api";
import type { FunctionArgs } from "convex/server";

import { readAudioDuration } from "@/features/audio/audio-file";
import { processImageSizes, sha256Hex } from "@/features/media/process-image";

import { detectJsonFiles, type JsonRole } from "./import-files";
import type { ImportTarget } from "./types";

type DropRecord = FunctionArgs<
	typeof api.admin.imports.compare
>["records"][number];
type AudioExt = NonNullable<DropRecord["audio"]>["ext"];

/** A drop read in the browser, ready for `api.admin.imports.compare`. */
export interface PreparedDrop {
	/** What compare may ask to upload, by `blobKey(record index, part)`. */
	blobs: Map<string, Blob>;
	/** "4 JSON, 6 markdown, 6 media", for the imports list. */
	label: string;
	records: DropRecord[];
}

export const blobKey = (index: number, part: "audio" | number) =>
	`${index}:${part}`;

/** The WebP sizes each role's image is uploaded at, as the ingest scripts make them. */
const IMAGE: Partial<
	Record<JsonRole, { field: "coverPath" | "thumbPath"; sizes: number[] }>
> = {
	entries: { field: "coverPath", sizes: [512, 1280] },
	hubs: { field: "coverPath", sizes: [1280] },
	topics: { field: "thumbPath", sizes: [1080] },
	tracks: { field: "thumbPath", sizes: [1080] },
};

const AUDIO_EXTENSIONS: readonly AudioExt[] = ["m4a", "mp3", "wav"];

const baseName = (path: string) => path.slice(path.lastIndexOf("/") + 1);

const extOf = (name: string) =>
	name.slice(name.lastIndexOf(".") + 1).toLowerCase();

const stringField = (record: Record<string, unknown>, key: string) => {
	const value = record[key];
	return typeof value === "string" && value ? value : undefined;
};

const messageOf = (error: unknown) =>
	error instanceof Error ? error.message : String(error);

type FindFile = (path: string) => File;
type ImageOf = (
	file: File,
	sizes: number[]
) => ReturnType<typeof processImageSizes>;

/** Paths match dropped files by name, since a drop is flat. */
function fileFinder(files: readonly File[]): FindFile {
	const byName = new Map<string, File[]>();
	for (const file of files) {
		if (!file.name.toLowerCase().endsWith(".json")) {
			byName.set(file.name, [...(byName.get(file.name) ?? []), file]);
		}
	}
	return (path) => {
		const matches = byName.get(baseName(path)) ?? [];
		const [file] = matches;
		if (!file) {
			throw new Error(`${path} isn't in the drop`);
		}
		if (matches.length > 1) {
			throw new Error(
				`${baseName(path)} is in the drop ${matches.length} times: rename one`
			);
		}
		return file;
	};
}

/** Shared art (one thumbnail on many tracks) is processed once. */
function imageCache(): ImageOf {
	const images = new Map<string, ReturnType<typeof processImageSizes>>();
	return (file, sizes) => {
		const key = `${file.name}|${file.size}|${sizes.join(",")}`;
		let image = images.get(key);
		if (!image) {
			image = processImageSizes(file, sizes);
			images.set(key, image);
		}
		return image;
	};
}

async function readAudio(
	file: File
): Promise<NonNullable<DropRecord["audio"]>> {
	const ext = AUDIO_EXTENSIONS.find((option) => option === extOf(file.name));
	if (!ext) {
		throw new Error(`${file.name}: use an MP3, M4A or WAV file`);
	}
	return {
		bytes: file.size,
		durationSec: await readAudioDuration(file),
		ext,
		name: file.name,
		sha256: await sha256Hex(await file.arrayBuffer()),
	};
}

/** Runs `read`, keeping its result, or its error for compare to judge. */
async function attempt<T>(
	errors: NonNullable<DropRecord["fileErrors"]>,
	part: "audio" | "body" | "image",
	read: () => Promise<T>
): Promise<T | undefined> {
	try {
		return await read();
	} catch (error) {
		errors[part] = messageOf(error);
	}
}

/** One record with what its files hold, and the blobs compare may ask to upload. */
async function readRecord(
	record: Record<string, unknown>,
	role: JsonRole,
	find: FindFile,
	imageOf: ImageOf
): Promise<{ blobs: Map<"audio" | number, Blob>; drop: DropRecord }> {
	const drop: DropRecord = { record, role };
	const blobs = new Map<"audio" | number, Blob>();
	const errors: NonNullable<DropRecord["fileErrors"]> = {};

	const bodyPath =
		role === "entries" ? stringField(record, "bodyPath") : undefined;
	if (bodyPath) {
		drop.body = await attempt(errors, "body", () => find(bodyPath).text());
	}

	const audioPath =
		role === "tracks" ? stringField(record, "audioPath") : undefined;
	if (audioPath) {
		drop.audio = await attempt(errors, "audio", async () => {
			const file = find(audioPath);
			blobs.set("audio", file);
			return await readAudio(file);
		});
	}

	const image = IMAGE[role];
	const imagePath = image && stringField(record, image.field);
	if (image && imagePath) {
		drop.image = await attempt(errors, "image", async () => {
			const file = find(imagePath);
			const processed = await imageOf(file, image.sizes);
			for (const { file: webp, px } of processed.webp) {
				blobs.set(px, webp);
			}
			return {
				bytes: file.size,
				name: file.name,
				thumbhash: processed.thumbhash,
				webp: processed.webp.map(({ file: webp, px, sha256 }) => ({
					bytes: webp.size,
					px,
					sha256,
				})),
			};
		});
	}

	if (Object.keys(errors).length > 0) {
		drop.fileErrors = errors;
	}
	return { blobs, drop };
}

function labelOf(files: readonly File[]) {
	const json = files.filter((file) =>
		file.name.toLowerCase().endsWith(".json")
	);
	const markdown = files.filter((file) =>
		file.name.toLowerCase().endsWith(".md")
	);
	const media = files.length - json.length - markdown.length;
	return [
		`${json.length} JSON`,
		markdown.length > 0 ? `${markdown.length} markdown` : undefined,
		media > 0 ? `${media} media` : undefined,
	]
		.filter(Boolean)
		.join(", ");
}

/**
 * Reads the dropped records and the files they name. A file that's missing or
 * unreadable is reported, not thrown: compare decides whether the record needs it
 * (a copy edit can leave its cover out).
 */
export async function prepareDrop(
	target: ImportTarget,
	files: readonly File[],
	onProgress: (message: string) => void
): Promise<PreparedDrop> {
	const detections = await detectJsonFiles(target, files);
	const all = detections.flatMap((detection) =>
		detection.role === null
			? []
			: detection.records.map((record) => ({ record, role: detection.role }))
	);
	const find = fileFinder(files);
	const imageOf = imageCache();
	const records: DropRecord[] = [];
	const blobs = new Map<string, Blob>();
	for (const [index, { record, role }] of all.entries()) {
		onProgress(`Reading record ${index + 1} of ${all.length}…`);
		// One record at a time: images are processed on this thread, and a big drop
		// processed all at once would hold every decoded image in memory.
		// biome-ignore lint/performance/noAwaitInLoops: deliberately sequential, see above
		const read = await readRecord(record, role, find, imageOf);
		records.push(read.drop);
		for (const [part, blob] of read.blobs) {
			blobs.set(blobKey(index, part), blob);
		}
	}
	return { blobs, label: labelOf(files), records };
}
