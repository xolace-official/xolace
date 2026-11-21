/** The two share formats, at the loop's 720 p. */
export type QuoteVideoSize = "story" | "square";

export interface ExportQuoteVideoOptions {
	/**
	 * The loop's ambient sound as a local `file://` URI (AAC `.m4a`), looped or trimmed to the
	 * video's length. Omitted: the video is silent, as the loop's own mp4 is.
	 */
	audioUri?: string;
	/** Where the crop sits vertically, 0 top … 1 bottom. Default 0.5. */
	focusY?: number;
	/** A transparent PNG (720 × 1280 or 720 × 720): the scrim, the quote and the wordmark. */
	overlayUri: string;
	size: QuoteVideoSize;
	/** The loop's local `file://` URI. */
	videoUri: string;
}

export interface ExportQuoteVideoResult {
	bytes: number;
	/** Whether the ambient sound made it into the video (false when none was passed or it failed). */
	hasAudio?: boolean;
	/** How long the export took on the phone, in ms. */
	ms: number;
	/** The mp4 in the app's caches directory. */
	uri: string;
}
