import * as Sharing from "expo-sharing";
import type { ComponentRef } from "react";
import { PixelRatio, Platform, type View } from "react-native";
import { captureRef } from "react-native-view-shot";

/**
 * Capture a mounted view as a PNG and hand a local file to the share sheet. Used by the
 * quote posters and the badge share card; each passes its own error copy, so the message a
 * person reads stays the feature's.
 */

type CardView = ComponentRef<typeof View>;
export type ShareMedia = "image" | "video";

const TYPES = {
	image: { mimeType: "image/png", UTI: "public.png" },
	video: { mimeType: "video/mp4", UTI: "public.mpeg-4" },
} as const satisfies Record<ShareMedia, Sharing.SharingOptions>;

/** view-shot sizes are points on iOS (it multiplies by the screen scale), pixels on Android. */
const captureUnits = (px: number) =>
	Platform.OS === "ios" ? px / PixelRatio.get() : px;

/** A PNG of `view` at `width` × `height` pixels, as a temporary file. */
export async function capturePng(
	view: CardView | null,
	size: { width: number; height: number },
	notReady: string
): Promise<string> {
	if (!view) {
		throw new Error(notReady);
	}
	return await captureRef(view, {
		format: "png",
		height: captureUnits(size.height),
		result: "tmpfile",
		width: captureUnits(size.width),
	});
}

/** The system share sheet with one local file; `unavailable` when the phone has none. */
export async function shareLocalFile(
	uri: string,
	media: ShareMedia,
	unavailable: string,
	dialogTitle?: string
): Promise<void> {
	if (!(await Sharing.isAvailableAsync())) {
		throw new Error(unavailable);
	}
	await Sharing.shareAsync(uri, { ...TYPES[media], dialogTitle });
}
