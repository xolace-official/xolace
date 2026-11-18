import type { api } from "@xolace/backend/api";
import type { FunctionReturnType } from "convex/server";

/** One row of `sessions.listForTimeline`'s page. */
type TimelineRow = FunctionReturnType<
	typeof api.sessions.listForTimeline
>["page"][number];

/** A moment as Today's carousel draws it. */
export type MomentView = {
	id: string;
	/** The mirror's line, with production's em dashes turned to commas. */
	quote: string;
	/** The finer label when there is one, else the session's primary emotion. */
	emotion: string | null;
	/** The mirror was spoken: a speaker badge. */
	audio: boolean;
};

/** A timeline row as a moment (production's `toTimelineEntry` + `discovery-moment-card`). */
export function momentView(row: TimelineRow): MomentView {
	return {
		audio: row.hasMirrorAudio,
		emotion: row.granularLabel ?? row.primaryEmotion,
		id: row._id,
		quote: row.mirrorText
			.replace(/\s*—\s*/g, ", ")
			.replace(/ {2}/g, " ")
			.trim(),
	};
}

/** The production emotion map, moved from Discovery's `timeline-entry.ts` (its last reader). */
const EMOTION_EMOJI: Record<string, string> = {
	ambivalence: "⚖️",
	anger: "😤",
	anxiety: "😰",
	calm: "🟢",
	confusion: "🌀",
	contentment: "☀️",
	demotivation: "🛋️",
	disappointment: "🥺",
	disconnection: "🔌",
	disgust: "🤢",
	disorientation: "🌪️",
	embarrassment: "😳",
	"emotional exhaustion": "🔋",
	"emotional flatness": "🫥",
	"emotional shutdown": "🛑",
	exhaustion: "🪫",
	fear: "😨",
	flatness: "➖",
	frustration: "😔",
	gratitude: "🙏",
	grief: "🥀",
	guilt: "😞",
	heartbreak: "💔",
	homesickness: "🏠",
	hope: "🌱",
	hopelessness: "🕳️",
	inadequacy: "🪨",
	joy: "😊",
	loneliness: "🫥",
	love: "💛",
	"not-belonging": "🚪",
	numbness: "🧊",
	overwhelm: "🌊",
	paralysis: "⏸️",
	pride: "🌟",
	rage: "🔥",
	regret: "🍂",
	relief: "😮‍💨",
	resentment: "💢",
	restlessness: "⚡",
	sadness: "😢",
	"self-directed shame": "🪞",
	"self-doubt": "🫣",
	shame: "😶",
	stress: "😬",
	surprise: "😲",
	uncertainty: "❓",
};

/** Emoji for an emotion name (case-insensitive); '💭' when null or unknown. */
export function getEmotionEmoji(emotion: string | null): string {
	if (!emotion) {
		return "💭";
	}
	return EMOTION_EMOJI[emotion.toLowerCase()] ?? "💭";
}

/** Human-facing label for an emotion; 'Reflection' when null or empty. */
export function getEmotionLabel(emotion: string | null): string {
	if (!emotion) {
		return "Reflection";
	}
	const words = emotion.replace(/-/g, " ");
	return words.charAt(0).toUpperCase() + words.slice(1);
}
