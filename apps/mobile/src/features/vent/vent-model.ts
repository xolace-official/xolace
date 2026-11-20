import type { PlusStatus } from "@/features/purchases/plus-status";

const FREE_CEILING_MS = 120_000;
const PLUS_CEILING_MS = 150_000;
export const SOON_MS = 10_000;

export const PER_WORD_MS = 240;
export const LIT_MS = 900;
const VOICE_TAIL_MS = 600;
const COOLED_MS = 640;

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

export const ceilingMs = (plus: PlusStatus) =>
	plus === "free" ? FREE_CEILING_MS : PLUS_CEILING_MS;

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

export const replyWords = (words: string): string[] =>
	words.split(" ").filter((w) => w.length > 0);

export type ReplyPace = {
	starts: number[];
	ashAt: number;
};

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
	soonNow: boolean;
	soonIn: number | null;
	releaseIn: number;
};

export function ceilingPlan(ceiling: number, recordedMs: number): CeilingPlan {
	const left = Math.max(0, ceiling - recordedMs);
	const soonNow = left <= SOON_MS;
	return { releaseIn: left, soonIn: soonNow ? null : left - SOON_MS, soonNow };
}

export type UnderMic = {
	text: "recording" | "soon" | "capBefore";
	amber: boolean;
};

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
