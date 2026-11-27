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

/**
 * What VoiceOver hears as the strip's `line` changes; `heard` is the last line it spoke.
 * Each new message is spoken once. "Reconnecting." lasts only the grace, so it's never
 * spoken and doesn't count as a change; the strip clearing forgets what was said.
 */
export function stripSpeech(
	heard: string | null,
	line: string | null
): { announce: string | null; heard: string | null } {
	if (line === null) {
		return { announce: null, heard: null };
	}
	if (line === THREAD.reconnecting || line === heard) {
		return { announce: null, heard };
	}
	return { announce: line, heard: line };
}
