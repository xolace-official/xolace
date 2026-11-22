"use client";

import { api } from "@xolace/backend/api";
import { useMutation } from "convex/react";
import type { FunctionArgs } from "convex/server";

import { processImage, sha256Hex } from "./process-image";
import { putObject } from "./put-object";

type ImageUse = FunctionArgs<typeof api.admin.uploads.imageUploadUrl>["use"];
type AudioArgs = FunctionArgs<typeof api.admin.uploads.audioUploadUrl>;

/** Longest side of each processed image, as the ingest scripts size them. */
const IMAGE_PX: Record<ImageUse, number> = { hubCover: 1280, thumb: 1080 };

/**
 * MP3 or WAV: the formats the player's waveform can be measured from
 * (`convex/audio/formats.ts`). M4A has no decoder there, so it isn't taken.
 */
const AUDIO_EXTENSIONS: readonly AudioArgs["ext"][] = ["mp3", "wav"];

/** For a file input's `accept`: by type as well as extension, which the dropzone matches case-sensitively. */
export const AUDIO_ACCEPT =
	".mp3,.wav,audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/wave";

function audioExtension(name: string): AudioArgs["ext"] {
	const ext = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
	const known = AUDIO_EXTENSIONS.find((option) => option === ext);
	if (!known) {
		throw new Error(`${name}: use an MP3 or WAV file`);
	}
	return known;
}

/**
 * Uploads straight from the browser to R2: Convex mints the URL and picks the
 * key, then the provider's mutation points the row at it.
 */
export function useMediaUpload() {
	const imageUploadUrl = useMutation(api.admin.uploads.imageUploadUrl);
	const audioUploadUrl = useMutation(api.admin.uploads.audioUploadUrl);
	const discardAudio = useMutation(api.admin.uploads.discardAudio);

	return {
		/**
		 * Upload a track's audio, then `save` it to the row. Audio keys are unique per
		 * upload, so if the save is rejected the file would be orphaned: it's discarded.
		 */
		audio: async (
			file: File,
			track: Pick<AudioArgs, "family" | "slug">,
			save: (uploaded: { key: string; sha256: string }) => Promise<unknown>
		) => {
			const ext = audioExtension(file.name);
			const sha256 = await sha256Hex(await file.arrayBuffer());
			const { key, url } = await audioUploadUrl({ ...track, ext });
			await putObject(url, file);
			try {
				await save({ key, sha256 });
			} catch (error) {
				// Best effort: the save's error is the one to show.
				await discardAudio({ key }).catch(() => undefined);
				throw error;
			}
		},
		image: async (
			file: File,
			use: ImageUse
		): Promise<{ sha256: string; thumbhash: string }> => {
			const {
				file: webp,
				sha256,
				thumbhash,
			} = await processImage(file, IMAGE_PX[use]);
			const { url } = await imageUploadUrl({ sha256, use });
			await putObject(url, webp);
			return { sha256, thumbhash };
		},
	};
}
