import type { Id } from "@xolace/backend/dataModel";

import { processImage } from "@/features/media/process-image";

import { EVENT_IMAGE, imageShapeProblem } from "./types";

/**
 * Check the picked file is the sheet's shape, shrink it to 686 px wide as WebP,
 * and POST it to a Convex storage upload URL. Throws with a message for the
 * editor when the shape is wrong or the upload fails.
 */
export async function uploadEventImage(
	file: File,
	uploadUrl: () => Promise<string>
): Promise<Id<"_storage">> {
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
