import type { api } from "@xolace/backend/api";
import type { FunctionReturnType } from "convex/server";

type TimelineRow = FunctionReturnType<
	typeof api.sessions.listForTimeline
>["page"][number];

export type MomentView = {
	id: string;
	quote: string;
	emotion: string | null;
	audio: boolean;
};

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

export function getEmotionEmoji(emotion: string | null): string {
	if (!emotion) {
		return "💭";
	}
	return EMOTION_EMOJI[emotion.toLowerCase()] ?? "💭";
}

export function getEmotionLabel(emotion: string | null): string {
	if (!emotion) {
		return "Reflection";
	}
	const words = emotion.replace(/-/g, " ");
	return words.charAt(0).toUpperCase() + words.slice(1);
}
