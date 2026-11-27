import type { Reach } from "@/lib/connection/connection-model";
import { THREAD } from "./copy";

/** Stream's connection as the strip tells it. */
export type ChatStream = "online" | "reconnecting" | "down";

/**
 * Stream keeps "recovering" for as long as it's down, so recovering reads as reconnecting
 * only until `held`: Stream has been offline for the app's connection grace.
 */
export function chatStream({
	isOnline,
	recovering,
	held,
}: {
	/** Stream's own reading: `null` before it has one. */
	isOnline: boolean | null;
	/** Stream lost its socket and is trying again. */
	recovering: boolean;
	held: boolean;
}): ChatStream {
	if (isOnline !== false) {
		return "online";
	}
	return recovering && !held ? "reconnecting" : "down";
}

/**
 * Chat's one connection message, shown when the device is offline, Stream is offline or
 * Xolace can't be reached; `null` otherwise. "Offline" only when the device is.
 */
export function connectionStripLine({
	reach,
	stream,
}: {
	reach: Reach;
	stream: ChatStream;
}): string | null {
	if (reach === "offline") {
		return THREAD.offlineStrip;
	}
	if (reach === "reachable") {
		if (stream === "online") {
			return null;
		}
		if (stream === "reconnecting") {
			return THREAD.reconnecting;
		}
	}
	return THREAD.cantReachStrip;
}
