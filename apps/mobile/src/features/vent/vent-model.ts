/**
 * Vent's rules as pure functions: what comes after the burn, when the vent lets go on its own,
 * how the reply is paced against its voice, and what the line under the mic says. No React, no
 * Convex (handoff `vent.md`; production's `use-vent-flow.ts` for the server's side).
 */

/** Production's ceilings keep the m4a under Convex's 1 MB `v.bytes()` (mono 48 kbps ≈ 6 KB/s). */
const FREE_CEILING_MS = 120_000;
const PLUS_CEILING_MS = 150_000;
/** v2: the line under the mic changes this long before the ceiling. */
export const SOON_MS = 10_000;

/** v2: a word starts lighting every 240 ms when there is no voice to follow. */
export const PER_WORD_MS = 240;
/** A word takes this long to catch and cool. */
export const LIT_MS = 900;
/** v2: the words burn this long after the voice ends… */
const VOICE_TAIL_MS = 600;
/** …and never before the last word has cooled for this long (the board: words × 240 + 1300). */
const COOLED_MS = 640;

/** The server's answer (`vent.processVentAudio`), or `"error"` when the upload failed. */
export type VentResult =
	| {
			words: string | null;
			audioUrl: string | null;
			isCrisis: boolean;
			capReached: boolean;
	  }
	| "error";

export type AfterBurn =
	| { stage: "heard"; words: string; crisis: boolean; audioUrl: string | null }
	| { stage: "gone"; capReached: boolean };

/** Auto-release after this long, with no timer on screen (production). */
export const ceilingMs = (isPlus: boolean) =>
	isPlus ? PLUS_CEILING_MS : FREE_CEILING_MS;

/** Audio tags like `[sighs]` are for the voice only, never shown (production). */
export function displayWords(words: string | null): string | null {
	if (!words) {
		return null;
	}
	return (
		words
			.replace(/\[[^\]]*\]/g, " ")
			.replace(/\s+/g, " ")
			.trim() || null
	);
}

/**
 * What the burn gives way to once it has played and the server has answered (production's
 * `tryAdvance`): the reply's words, or straight to "Gone." when there are none. A failure, a
 * near-silent take (the server returns no words under 20 characters) and the daily cap all burn
 * anyway; only the cap says so.
 */
export function afterBurn(result: VentResult): AfterBurn {
	if (result === "error") {
		return { capReached: false, stage: "gone" };
	}
	const words = displayWords(result.words);
	if (!words) {
		return { capReached: result.capReached, stage: "gone" };
	}
	return {
		audioUrl: result.audioUrl,
		crisis: result.isCrisis,
		stage: "heard",
		words,
	};
}

/** The reply as the words it lights one by one. */
export const replyWords = (words: string): string[] =>
	words.split(" ").filter((w) => w.length > 0);

export type ReplyPace = {
	/** When each word starts to light, in ms from when the voice starts. */
	starts: number[];
	/** When the words start to burn (v2, §10). */
	ashAt: number;
};

/**
 * v2: each word lights when the voice reaches it (§9). With a voice, its length split by word
 * length (each word and its space); without one, 240 ms a word. The words burn 600 ms after the
 * voice ends, once the last word has cooled.
 */
export function replyPace(words: string[], voiceMs: number | null): ReplyPace {
	const lengths = words.map((w) => w.length + 1);
	const total = lengths.reduce((a, b) => a + b, 0);
	let before = 0;
	const starts = words.map((_, i) => {
		const at =
			voiceMs !== null && voiceMs > 0 && total > 0
				? (voiceMs * before) / total
				: i * PER_WORD_MS;
		before += lengths[i] ?? 0;
		return Math.round(at);
	});
	const lastLit = (starts.at(-1) ?? 0) + LIT_MS + COOLED_MS;
	const ashAt = Math.max(lastLit, (voiceMs ?? 0) + VOICE_TAIL_MS);
	return { ashAt, starts };
}

export type CeilingPlan = {
	/** The line under the mic already says it lets go on its own. */
	soonNow: boolean;
	/** ms until the line changes (and the haptic), or null when it already has. */
	soonIn: number | null;
	/** ms until it lets go on its own. */
	releaseIn: number;
};

/** When the last 10 s begin and when it lets go, from what has been recorded so far. */
export function ceilingPlan(ceiling: number, recordedMs: number): CeilingPlan {
	const left = Math.max(0, ceiling - recordedMs);
	const soonNow = left <= SOON_MS;
	return { releaseIn: left, soonIn: soonNow ? null : left - SOON_MS, soonNow };
}

export type UnderMic = {
	text: "recording" | "soon" | "capBefore";
	amber: boolean;
};

/**
 * The line under the mic (v2): "Tap to let it go" while it listens, "It lets go on its own in a
 * moment" (amber) in the last 10 s, and the replies-used notice before a vent starts.
 */
export function underMic(
	phase: "idle" | "rec" | "other",
	soon: boolean,
	capBefore: boolean
): UnderMic | null {
	if (phase === "rec") {
		return soon
			? { amber: true, text: "soon" }
			: { amber: false, text: "recording" };
	}
	if (phase === "idle" && capBefore) {
		return { amber: false, text: "capBefore" };
	}
	return null;
}
