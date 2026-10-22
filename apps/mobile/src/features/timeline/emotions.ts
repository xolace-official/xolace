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

/**
 * Map an emotion name to its corresponding emoji.
 *
 * @param emotion - Emotion name to look up (case-insensitive); may be `null` to indicate no emotion
 * @returns The emoji for the provided emotion, or '💭' if `emotion` is null, falsy, or not found
 */
export function getEmotionEmoji(emotion: string | null): string {
	if (!emotion) {
		return "💭";
	}
	return EMOTION_EMOJI[emotion.toLowerCase()] ?? "💭";
}

/**
 * Produce a human-facing label for an emotion string.
 *
 * @param emotion - The emotion to label; may be `null` or empty to indicate no emotion.
 * @returns The emotion with hyphens as spaces and its first character capitalized, or `'Reflection'` if `emotion` is `null` or empty.
 */
export function getEmotionLabel(emotion: string | null): string {
	if (!emotion) {
		return "Reflection";
	}
	const words = emotion.replace(/-/g, " ");
	return words.charAt(0).toUpperCase() + words.slice(1);
}

const PATH_LABELS: Record<string, string> = {
	exit: "Just needed to say it",
	peers: "You're not alone",
	solo: "Sat with this",
};

/**
 * Map a chosen path key to its display label.
 *
 * @param pathChosen - The path key selected by the user; may be null or undefined
 * @returns The label for `pathChosen`, or `Reflected` if `pathChosen` is falsy or not recognized
 */
export function getPathLabel(pathChosen: string | null): string {
	if (!pathChosen) {
		return "Reflected";
	}
	return PATH_LABELS[pathChosen] ?? "Reflected";
}
