import type { Id } from "@xolace/backend/dataModel";

import { processImage } from "@/features/media/process-image";

import { EVENT_IMAGE, imageShapeProblem } from "./types";

/**
 * Check the picked file is the sheet's shape and shrink it to 686 px wide as
 * WebP. Throws with a message for the editor when the shape is wrong.
 */
export async function prepareEventImage(file: File): Promise<Blob> {
	let size: { height: number; width: number };
	try {
		const bitmap = await createImageBitmap(file);
		size = { height: bitmap.height, width: bitmap.width };
		bitmap.close();
	} catch (error) {
		throw new Error(`Can't read ${file.name} as an image`, { cause: error });
	}
	const problem = imageShapeProblem(size.width, size.height);
	if (problem) {
		throw new Error(problem);
	}
	const { file: webp } = await processImage(file, EVENT_IMAGE.width);
	return webp;
}

/** POST a prepared image to a Convex storage upload URL. */
export async function uploadEventImage(
	webp: Blob,
	uploadUrl: () => Promise<string>
): Promise<Id<"_storage">> {
	const response = await fetch(await uploadUrl(), {
		body: webp,
		headers: { "Content-Type": webp.type },
		method: "POST",
	});
	if (!response.ok) {
		throw new Error(`Upload failed (${response.status})`);
	}
	const { storageId } = (await response.json()) as {
		storageId: Id<"_storage">;
	};
	return storageId;
}
