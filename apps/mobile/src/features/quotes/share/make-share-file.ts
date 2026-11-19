import {
	requestPermissionsAsync,
	saveToLibraryAsync,
} from "expo-media-library/legacy";
import * as Sharing from "expo-sharing";
import { type ComponentRef, createRef } from "react";
import { PixelRatio, type View } from "react-native";
import { captureRef } from "react-native-view-shot";
import { QUOTE_COPY } from "../copy";
import type { ShareFmt } from "../motion/quote-ui";

/** The image is 1080 px wide. */
const IMAGE_W = 1080;
const STORY = 16 / 9;

/** The off-screen capture card (one quote screen at a time); read only on Save or Share. */
export const CARD_REF = createRef<ComponentRef<typeof View>>();

/** view-shot sizes are points (it multiplies by the screen scale), so pixels ÷ the pixel ratio. */
const size = (px: number, fmt: ShareFmt) => {
	const w = px / PixelRatio.get();
	return { height: fmt === "story" ? w * STORY : w, width: w };
};

/** The still, made on the phone: view-shot of the off-screen card at 1080 px. Nothing leaves it. */
export async function makeStill(fmt: ShareFmt): Promise<string> {
	if (!CARD_REF.current) {
		throw new Error(QUOTE_COPY.errors.cardNotReady);
	}
	return await captureRef(CARD_REF.current, {
		format: "png",
		result: "tmpfile",
		...size(IMAGE_W, fmt),
	});
}

/** Save to Photos with add-only permission. */
export async function saveToPhotos(uri: string): Promise<void> {
	const perm = await requestPermissionsAsync(true);
	if (!perm.granted) {
		throw new Error(QUOTE_COPY.errors.cantSave);
	}
	await saveToLibraryAsync(uri);
}

export async function shareImage(uri: string): Promise<void> {
	if (!(await Sharing.isAvailableAsync())) {
		throw new Error(QUOTE_COPY.errors.noShare);
	}
	await Sharing.shareAsync(uri, { mimeType: "image/png", UTI: "public.png" });
}
