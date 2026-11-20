import type { QuoteBackground } from "../quotes-model";

export type ShareKind = "video" | "still";

/**
 * What a share makes: a video only on a loop, when asked for, and where the phone's build has
 * the video module (iOS from the build that added it). Everywhere else, the still.
 */
export function shareKindOf(
	background: Pick<QuoteBackground, "kind" | "videoUrl">,
	asked: ShareKind,
	videoAvailable: boolean
): ShareKind {
	const loop = background.kind === "loop" && Boolean(background.videoUrl);
	return loop && videoAvailable && asked === "video" ? "video" : "still";
}

/** The Video | Still choice shows only where a video can be made. */
export const canShareVideo = (
	background: Pick<QuoteBackground, "kind" | "videoUrl">,
	videoAvailable: boolean
) => shareKindOf(background, "video", videoAvailable) === "video";

const SAFE = /[^a-z0-9.-]/gi;

/** A stable cache name for a loop: the background's key and the file's own name. */
export function loopFileName(key: string, url: string): string {
	const last = url.split("?")[0]?.split("/").pop() || "loop.mp4";
	return `${key}-${last}`.replace(SAFE, "_");
}
