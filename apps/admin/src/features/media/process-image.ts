import { rgbaToThumbHash } from "thumbhash";

/**
 * Images are processed in the browser before upload, with the ingest scripts'
 * sharp settings (`packages/backend/scripts/kindling/ingest.ts`): Lanczos3 down
 * to fit the box (never up), WebP at quality 78 and effort 6, and a ThumbHash
 * for the load placeholder. jSquash runs the same libwebp encoder as sharp, as
 * WebAssembly, so quality matches; the bytes (and so the key) can differ from
 * a script run of the same file.
 */

const WEBP_OPTIONS = { method: 6, quality: 78 } as const;

/** ThumbHash encodes at most 100×100 RGBA. */
const THUMBHASH_PX = 100;

export interface ProcessedImage {
	file: Blob;
	/** Hex SHA-256 of the WebP: its R2 key. */
	sha256: string;
	/** Base64 ThumbHash. */
	thumbhash: string;
}

/** sharp's `fit: "inside"` with `withoutEnlargement`. */
export function fitInside(width: number, height: number, max: number) {
	const scale = Math.min(1, max / width, max / height);
	return {
		height: Math.max(1, Math.round(height * scale)),
		width: Math.max(1, Math.round(width * scale)),
	};
}

export async function sha256Hex(data: BufferSource) {
	const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
	return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join(
		""
	);
}

async function decode(file: File) {
	let bitmap: ImageBitmap;
	try {
		bitmap = await createImageBitmap(file);
	} catch (error) {
		throw new Error(`Can't read ${file.name} as an image`, { cause: error });
	}
	const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
	const context = canvas.getContext("2d");
	if (!context) {
		throw new Error("This browser can't process images");
	}
	context.drawImage(bitmap, 0, 0);
	bitmap.close();
	return context.getImageData(0, 0, canvas.width, canvas.height);
}

async function shrink(image: ImageData, max: number) {
	const size = fitInside(image.width, image.height, max);
	if (size.width === image.width && size.height === image.height) {
		return image;
	}
	// Loaded on first use: the codecs are WebAssembly, needed only on upload.
	const { default: resize } = await import("@jsquash/resize");
	// libvips resizes in sRGB with premultiplied alpha.
	return resize(image, {
		...size,
		fitMethod: "stretch",
		linearRGB: false,
		method: "lanczos3",
		premultiply: true,
	});
}

/** A WebP no bigger than `maxPx` on either side, with its hash and ThumbHash. */
export async function processImage(
	file: File,
	maxPx: number
): Promise<ProcessedImage> {
	const {
		thumbhash,
		webp: [first],
	} = await processImageSizes(file, [maxPx]);
	if (!first) {
		throw new Error(`Couldn't process ${file.name}`);
	}
	return { file: first.file, sha256: first.sha256, thumbhash };
}

/**
 * One WebP per size, from a single decode (an entry cover is uploaded at 512 and
 * 1280), and one ThumbHash from the largest.
 */
export async function processImageSizes(
	file: File,
	sizes: readonly number[]
): Promise<{
	thumbhash: string;
	webp: { file: Blob; px: number; sha256: string }[];
}> {
	const source = await decode(file);
	const { default: encode } = await import("@jsquash/webp/encode");
	const resized = await Promise.all(
		[...sizes]
			.sort((a, b) => b - a)
			.map(async (px) => ({ image: await shrink(source, px), px }))
	);
	const [largest] = resized;
	if (!largest) {
		throw new Error("No image sizes asked for");
	}
	const webp = await Promise.all(
		resized.map(async ({ image, px }) => {
			const bytes = await encode(image, WEBP_OPTIONS);
			return {
				file: new Blob([bytes], { type: "image/webp" }),
				px,
				sha256: await sha256Hex(bytes),
			};
		})
	);
	const small = await shrink(largest.image, THUMBHASH_PX);
	const hash = rgbaToThumbHash(small.width, small.height, small.data);
	return { thumbhash: btoa(String.fromCharCode(...hash)), webp };
}
