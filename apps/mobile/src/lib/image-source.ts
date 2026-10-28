import type { ImageSource } from "expo-image";

/** `expo-image` source; a signed R2 link is cached by its path (signature changes per read;
 * keys are content-addressed). */
export function imageSource(uri: string): ImageSource {
	const q = uri.indexOf("?");
	return q !== -1 && uri.includes("X-Amz-Signature", q)
		? { cacheKey: uri.slice(0, q), uri }
		: { uri };
}
