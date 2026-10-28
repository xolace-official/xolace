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

/**
 * Translate a client entry type into the corresponding server-side entry type.
 *
 * @param clientType - The client-facing entry type to map
 * @returns The corresponding `ServerEntryType` value from `ENTRY_TYPE_MAP`
 */
export function mapEntryType(clientType: EntryType): ServerEntryType {
	return ENTRY_TYPE_MAP[clientType];
}

/**
 * The one authority for "server state → which screen". Edge semantics: the
 * machine applies this only when `serverState` *changes*, so the ambiguous
 * pair (mirror_delivered, processing) is unambiguous here — at that edge the
 * server just delivered, so the mirror wins. Between edges, local dispatches
 * own the screen.
 *
 * @returns The screen the server mandates, or `null` when the local screen
 * wins (pre-processing states, mirror-phase sub-modes, terminal states).
 */
export function projectScreen(
	serverState: ServerSessionState,
	localScreen: ReflectionStateName,
	escalationTriggered: boolean
): ReflectionStateName | null {
	switch (serverState) {
		case "initiated":
		case "input_received":
			// Pre-processing — local owns idle / typing / nudge / optimistic processing
			return null;
		case "processing":
			return "processing";
		case "mirror_delivered":
			// Local sub-modes (clarify, gave-up) and the optimistic That's-it advance
			// all happen while the server sits in mirror_delivered — local wins.
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
			// In-path sessions are owned by the path screens (sit-with-this /
			// peer-reflections), never projected onto reflect. Mapping these to
			// path-selection resurrects stale sessions getActive picks up after
			// the current one ends.
			return null;
		case "error":
			return "error";
		case "completed":
		case "abandoned":
			return null; // terminal — machine resets instead of showing a screen
	}
}

/**
 * True when the error is the server's "maximum refinement turns" rejection.
 * Prefers the typed ConvexError code; falls back to message matching for
 * responses from a backend deployed before the code existed.
 */
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
 * True when a user-facing error message is a rate-limit rejection — either the
 * session-initiate limit (extractErrorMessage above) or the AI-mirror limit the
 * backend writes into the session via failSession (convex/ai/process.ts). Both
 * are the free/Plus cap, so the error screen offers the upgrade.
 */
export function isRateLimitMessage(message: string): boolean {
	return (
		message.includes("You've been reflecting a lot") ||
		message.includes("limit for reflections")
	);
}

/**
 * Produce a user-facing message derived from an error value.
 *
 * @param error - The value to inspect for generating a friendly message
 * @returns A string appropriate for the error:
 * - A rate-limit hint when the error is a RateLimited ConvexError
 * - A session-expired prompt when the error message contains 'Not authenticated'
 * - A generic retry prompt for other Error instances
 * - A generic unexpected-error message for non-Error inputs
 */
export function extractErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		// Production scrubs the error *message* to "Server Error" — only
		// ConvexError `data` crosses the wire — so the typed data is the only
		// reliable signal. The message check stays for dev and for a
		// non-ConvexError rate-limit throw.
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
