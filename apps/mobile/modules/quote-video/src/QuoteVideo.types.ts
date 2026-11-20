/** The two share formats, at the loop's 720 p. */
export type QuoteVideoSize = "story" | "square";

export interface ExportQuoteVideoOptions {
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
	/** How long the export took on the phone, in ms. */
	ms: number;
	/** The mp4 in the app's caches directory. */
	uri: string;
}
