import type { ImageSource } from "expo-image";

export function imageSource(uri: string): ImageSource {
	const q = uri.indexOf("?");
	return q !== -1 && uri.includes("X-Amz-Signature", q)
		? { cacheKey: uri.slice(0, q), uri }
		: { uri };
}
