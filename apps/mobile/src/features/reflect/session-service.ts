import type { EntryType, ReflectionStateName } from "@/features/reflect/types";

type ServerEntryType =
	| "open_prompt"
	| "guided_entry"
	| "word_cloud"
	| "body_scan"
	| "voice"
	| "talk";

export type ServerSessionState =
	| "initiated"
	| "input_received"
	| "processing"
	| "mirror_delivered"
	| "confirmed"
	| "path_selected"
	| "path_in_progress"
	| "completed"
	| "abandoned"
	| "error";

const ENTRY_TYPE_MAP: Record<EntryType, ServerEntryType> = {
	hybrid: "guided_entry",
	scaffold: "word_cloud",
	typed: "open_prompt",
	voice: "voice",
};

/** Maps a client entry type to the server-side entry type. */
export function mapEntryType(clientType: EntryType): ServerEntryType {
	return ENTRY_TYPE_MAP[clientType];
}

/**
 * Server state to screen, applied only on a `serverState` change; null means local wins.
 */
export function projectScreen(
	serverState: ServerSessionState,
	localScreen: ReflectionStateName,
	escalationTriggered: boolean
): ReflectionStateName | null {
	switch (serverState) {
		case "initiated":
		case "input_received":
			// Local owns idle / typing / nudge / optimistic processing.
			return null;
		case "processing":
			return "processing";
		case "mirror_delivered":
			// Local sub-modes and the optimistic That's-it advance all happen while the
			// server sits in mirror_delivered.
			if (
				localScreen === "clarify" ||
				localScreen === "gave-up" ||
				localScreen === "path-selection"
			) {
				return null;
			}
			return escalationTriggered ? "escalation" : "mirror";
		case "confirmed":
			return "path-selection";
		case "path_selected":
		case "path_in_progress":
			// In-path sessions belong to the path screens. Mapping these to path-selection
			// resurrects stale sessions getActive picks up after the current one ends.
			return null;
		case "error":
			return "error";
		case "completed":
		case "abandoned":
			return null; // terminal: the machine resets instead of showing a screen
	}
}

/** True when the error is the server's "maximum refinement turns" rejection. */
export function isMaxRefinementError(error: unknown): boolean {
	const data = (error as { data?: { code?: string } } | null)?.data;
	if (data?.code === "max_refinement_turns") {
		return true;
	}
	// DEPRECATED(remove-after: backend always sends max_refinement_turns code):
	// message-substring fallback for the pre-ConvexError server throw.
	return (
		error instanceof Error && error.message.includes("Maximum refinement turns")
	);
}

/**
 * True for either rate-limit rejection: session-initiate (extractErrorMessage) or failSession.
 */
export function isRateLimitMessage(message: string): boolean {
	return (
		message.includes("You've been reflecting a lot") ||
		message.includes("limit for reflections")
	);
}

/** Produces a user-facing message for an error value. */
export function extractErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		// Production scrubs the message to "Server Error"; only ConvexError `data`
		// crosses the wire. The message check stays for dev.
		const raw = (error as { data?: unknown }).data;
		const data: { kind?: string; retryAfter?: number; code?: string } =
			typeof raw === "object" && raw !== null ? raw : {};
		if (data.kind === "RateLimited" || error.message.includes("RateLimited")) {
			const retryMinutes =
				typeof data.retryAfter === "number"
					? Math.ceil(data.retryAfter / 60_000)
					: parseRetryAfter(error.message);
			if (retryMinutes !== null && retryMinutes > 0) {
				return `You've been reflecting a lot. Come back in ${retryMinutes} ${retryMinutes === 1 ? "minute" : "minutes"}.`;
			}
			return "You've been reflecting a lot. Take a moment and come back soon.";
		}
		if (
			data.code === "not_authenticated" ||
			error.message.includes("Not authenticated")
		) {
			return "Your session expired. Please sign in again.";
		}
		return "Something went wrong. You can try again when you are ready.";
	}
	return "Something unexpected happened.";
}

/**
 * Extract retryAfter (ms) from a RateLimited ConvexError message and convert to minutes.
 */
function parseRetryAfter(message: string): number | null {
	const match = message.match(/"retryAfter"\s*:\s*([\d.]+)/);
	if (!match) {
		return null;
	}
	return Math.ceil(Number.parseFloat(match[1]) / 60_000);
}
