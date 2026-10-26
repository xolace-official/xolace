"use client";

import { api } from "@xolace/backend/api";
import { useMutation } from "convex/react";
import type { FunctionArgs } from "convex/server";

import { processImage, sha256Hex } from "./process-image";

type ImageUse = FunctionArgs<typeof api.admin.uploads.imageUploadUrl>["use"];
type AudioArgs = FunctionArgs<typeof api.admin.uploads.audioUploadUrl>;

/** Longest side of each processed image, as the ingest scripts size them. */
const IMAGE_PX: Record<ImageUse, number> = { hubCover: 1280, thumb: 1080 };

const AUDIO_EXTENSIONS: readonly AudioArgs["ext"][] = ["m4a", "mp3", "wav"];

function audioExtension(name: string): AudioArgs["ext"] {
	const ext = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
	const known = AUDIO_EXTENSIONS.find((option) => option === ext);
	if (!known) {
		throw new Error(`${name}: use an MP3, M4A or WAV file`);
	}
	return known;
}

/** PUT to a signed R2 URL. A network error here is almost always the bucket's CORS. */
async function putObject(url: string, body: Blob) {
	let response: Response;
	try {
		response = await fetch(url, {
			body,
			headers: { "Content-Type": body.type },
			method: "PUT",
		});
	} catch (error) {
		throw new Error(
			"Couldn't reach storage. Check the R2 bucket's CORS allows this site.",
			{ cause: error }
		);
	}
	if (!response.ok) {
		throw new Error(`Upload failed (${response.status})`);
	}
}

/**
 * Uploads straight from the browser to R2: Convex mints the URL and picks the
 * key, then the provider's mutation points the row at it.
 */
export function useMediaUpload() {
	const imageUploadUrl = useMutation(api.admin.uploads.imageUploadUrl);
	const audioUploadUrl = useMutation(api.admin.uploads.audioUploadUrl);

	return {
		audio: async (
			file: File,
			track: Pick<AudioArgs, "family" | "slug">
		): Promise<{ key: string; sha256: string }> => {
			const ext = audioExtension(file.name);
			const sha256 = await sha256Hex(await file.arrayBuffer());
			const { key, url } = await audioUploadUrl({ ...track, ext });
			await putObject(url, file);
			return { key, sha256 };
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
