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

const PATH_LABELS: Record<string, string> = {
	exit: "Just needed to say it",
	peers: "You're not alone",
	solo: "Sat with this",
};

/** Display label for a chosen path key; 'Reflected' when null or unknown. */
export function getPathLabel(pathChosen: string | null): string {
	if (!pathChosen) {
		return "Reflected";
	}
	return PATH_LABELS[pathChosen] ?? "Reflected";
}
