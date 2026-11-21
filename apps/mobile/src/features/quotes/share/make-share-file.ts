import { Directory, File, Paths } from "expo-file-system";
import {
	requestPermissionsAsync,
	saveToLibraryAsync,
} from "expo-media-library/legacy";
import * as Sharing from "expo-sharing";
import { type ComponentRef, createRef } from "react";
import { PixelRatio, Platform, type View } from "react-native";
import { captureRef } from "react-native-view-shot";
import { exportQuoteVideo } from "@/modules/quote-video";
import { QUOTE_COPY } from "../copy";
import type { ShareFmt } from "../motion/quote-ui";
import type { QuoteBackground } from "../quotes-model";
import { loopFileName, type ShareKind } from "./share-kind";

/** The image is 1080 wide; the video's overlay matches the loop's 720. */
const IMAGE_W = 1080;
const VIDEO_W = 720;
const STORY = 16 / 9;

export type ShareFile = { uri: string; kind: ShareKind };

/** The off-screen capture cards: the whole card for a still, the words alone for a video. */
export const CARD_REF = createRef<ComponentRef<typeof View>>();
export const OVERLAY_REF = createRef<ComponentRef<typeof View>>();

/** view-shot sizes are points on iOS (it multiplies by the screen scale), pixels on Android. */
const size = (px: number, fmt: ShareFmt) => {
	const w = Platform.OS === "ios" ? px / PixelRatio.get() : px;
	return { height: fmt === "story" ? w * STORY : w, width: w };
};

const capture = async (
	ref: typeof CARD_REF,
	px: number,
	fmt: ShareFmt
): Promise<string> => {
	if (!ref.current) {
		throw new Error(QUOTE_COPY.errors.cardNotReady);
	}
	return await captureRef(ref.current, {
		format: "png",
		result: "tmpfile",
		...size(px, fmt),
	});
};

const LOOPS = "quote-loops";
const pending = new Map<string, Promise<string>>();

async function downloadLoop(key: string, url: string): Promise<string> {
	const dir = new Directory(Paths.cache, LOOPS);
	dir.create({ idempotent: true, intermediates: true });
	const file = new File(dir, loopFileName(key, url));
	if (file.exists && file.size > 0) {
		return file.uri;
	}
	const got = await File.downloadFileAsync(url, file, { idempotent: true });
	return got.uri;
}

/**
 * A local copy of a loop, for the export (AVFoundation reads a file, not the R2 URL). Kept in
 * caches and reused; a download already under way is shared, so warming it when Share opens
 * and tapping Save at once fetch it once.
 */
export function localLoop(background: QuoteBackground): Promise<string> {
	const url = background.videoUrl;
	if (!url) {
		return Promise.reject(new Error(QUOTE_COPY.errors.loopMissing));
	}
	const inFlight = pending.get(url);
	if (inFlight) {
		return inFlight;
	}
	const run = downloadLoop(background.key, url)
		.catch((e: unknown) => {
			console.error("[quotes] loop download failed", e);
			throw new Error(QUOTE_COPY.errors.loopMissing, { cause: e });
		})
		.finally(() => pending.delete(url));
	pending.set(url, run);
	return run;
}

async function makeVideo(
	background: QuoteBackground,
	fmt: ShareFmt
): Promise<string> {
	const [videoUri, overlayUri] = await Promise.all([
		localLoop(background),
		capture(OVERLAY_REF, VIDEO_W, fmt),
	]);
	try {
		const out = await exportQuoteVideo({
			focusY: background.focus?.y,
			overlayUri,
			size: fmt,
			videoUri,
		});
		return out.uri;
	} catch (e) {
		console.error("[quotes] video export failed", e);
		throw new Error(QUOTE_COPY.errors.videoFailed, { cause: e });
	}
}

/**
 * Makes the share file on the phone. Still: view-shot of the off-screen card at 1080 px. Video:
 * view-shot of the transparent overlay at 720 px, put over one loop by the QuoteVideo module.
 * `kind` comes from `shareKindOf`, so a video is only asked for where it can be made.
 */
export async function makeShareFile(
	background: QuoteBackground,
	fmt: ShareFmt,
	kind: ShareKind
): Promise<ShareFile> {
	if (kind === "video") {
		return { kind, uri: await makeVideo(background, fmt) };
	}
	return { kind, uri: await capture(CARD_REF, IMAGE_W, fmt) };
}

/** Save to Photos with add-only permission; an image or an mp4. */
export async function saveToPhotos(uri: string): Promise<void> {
	const perm = await requestPermissionsAsync(true);
	if (!perm.granted) {
		throw new Error(QUOTE_COPY.errors.cantSave);
	}
	await saveToLibraryAsync(uri);
}

export async function shareFile(file: ShareFile): Promise<void> {
	if (!(await Sharing.isAvailableAsync())) {
		throw new Error(QUOTE_COPY.errors.noShare);
	}
	await Sharing.shareAsync(
		file.uri,
		file.kind === "video"
			? { mimeType: "video/mp4", UTI: "public.mpeg-4" }
			: { mimeType: "image/png", UTI: "public.png" }
	);
}
