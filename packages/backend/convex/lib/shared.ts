export const ERROR_CODES = {
	rateLimited: "rate_limited",
	reflectionRateLimited: "reflection_rate_limited",
	safeguardRejected: "content_policy_violation",
	swapLimitReached: "swap_limit_reached",
	swapNotAllowed: "swap_not_allowed",
} as const;
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
export type SessionErrorCode =
	| typeof ERROR_CODES.safeguardRejected
	| typeof ERROR_CODES.reflectionRateLimited;

export const STREAK_MILESTONES = [7, 30, 100] as const;
export const STREAK_MILESTONE_EVERY = 100;

export function isStreakMilestone(streak: number): boolean {
	const last = STREAK_MILESTONES[STREAK_MILESTONES.length - 1];
	return (
		(STREAK_MILESTONES as readonly number[]).includes(streak) ||
		(streak > last && streak % STREAK_MILESTONE_EVERY === 0)
	);
}

export const BADGE_PIN_LIMIT = 3;
export const LIBRARY_HELPED_FLOOR = 15;

export const QUOTE_REPLY_MAX_CHARS = 500;
export const REFLECTION_INPUT_MAX_CHARS = 5000;
/** Feeling words a reflection may carry alongside (or instead of) its text (B10). */
export const REFLECTION_MAX_TEXTURES = 4;
export const REFINEMENT_MAX_TURNS = 2;
export const EXERCISE_MAX_SWAPS = 2;

const SPOKEN_CHARACTER = /[\p{L}\p{N}]/u;
export const hasSpokenContent = (text: string): boolean =>
	SPOKEN_CHARACTER.test(text);

export const VOICE_SLUGS = ["sage", "wren", "vesper", "ash"] as const;
export type VoiceSlug = (typeof VOICE_SLUGS)[number];
export const isVoiceSlug = (slug: string | undefined): slug is VoiceSlug =>
	(VOICE_SLUGS as readonly (string | undefined)[]).includes(slug);
export const TALK_FALLBACK_VOICE: VoiceSlug = "vesper";
export const COMPANION_FALLBACK_NAME = "Ember";

export const TALK_DEMO_LINE_MAX_CHARS = 1000;
export const INTAKE_MAX_SELECTIONS = 3;
export const DISPLAY_NAME_MAX_CODE_POINTS = 30;

export const XOLACER_BIO_MAX_CHARS = 160;
export const XOLACER_NAME_MAX_CHARS = 40;
export const CRISIS_RESOURCES_KIND = "crisis_resources";

export const LETTER_MIN_CHARS = 40;
export const LETTER_MAX_CHARS = 500;
const LETTER_LINE_MAX_CHARS = 46;
const LETTER_LINE_CUT_CHARS = 44;
const TRAILING_PARTIAL_WORD = /\s+\S*$/;

export function letterOpeningLine(text: string): string {
	const first = text.split("\n")[0] ?? "";
	return first.length > LETTER_LINE_MAX_CHARS
		? `${first.slice(0, LETTER_LINE_CUT_CHARS).replace(TRAILING_PARTIAL_WORD, "")}…`
		: first;
}

export const RETENTION_KEEPS_LONGER = [
	"6_months",
	"1_year",
	"indefinite",
] as const;
export type RetentionTier = (typeof RETENTION_KEEPS_LONGER)[number];
export const retentionShortens = (from: RetentionTier, to: RetentionTier) =>
	RETENTION_KEEPS_LONGER.indexOf(to) < RETENTION_KEEPS_LONGER.indexOf(from);

export const FEEDBACK_MAX_CHARS = 1000;

export const PRESENCE_ROOM = "app";
export const PRESENCE_HEARTBEAT_MS = 30_000;

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;
export const WEEKS_BACK_MAX = 52;
export const EVENT_PROMPT_CARRY_MS = 7 * DAY_MS;
export const TELEGRAM_LINK_TTL_MS = 15 * MINUTE_MS;

export const DICTATION_BIT_RATE = 32_000;
export const DICTATION_MAX_TAKE_MS = 180_000;

export const BRIDGE_NAME_MAX_CHARS = 60;
export const BRIDGE_ADDRESS_TERM_MAX_CHARS = 40;
