import { type NativeModule, requireOptionalNativeModule } from "expo";

import type {
	ExportQuoteVideoOptions,
	ExportQuoteVideoResult,
} from "./QuoteVideo.types";

type QuoteVideoNative = NativeModule<Record<string, never>> & {
	exportQuoteVideo(
		options: ExportQuoteVideoOptions
	): Promise<ExportQuoteVideoResult>;
};

/** iOS only (AVFoundation). Null where the native module isn't built in: Android, an older binary. */
const native = requireOptionalNativeModule<QuoteVideoNative>("QuoteVideo");

export const quoteVideoAvailable = native !== null;

/** Puts the overlay over one loop of the video and exports an mp4 into the caches directory. */
export function exportQuoteVideo(
	options: ExportQuoteVideoOptions
): Promise<ExportQuoteVideoResult> {
	if (!native) {
		return Promise.reject(new Error("QuoteVideo isn't in this build."));
	}
	return native.exportQuoteVideo(options);
}
