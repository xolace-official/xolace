// The timeline's emotion labels and row shape, moved here when the timeline became Moments
// (S5d): Discovery's moments carousel is their last reader, and goes with Today's port (S1).

export interface TimelineEntry {
	confirmationState: string | null;
	createdAt: number;
	entryType: string;
	granularLabel: string | null;
	hasMirrorAudio: boolean;
	id: string;
	mirrorText: string;
	pathChosen: string | null;
	primaryEmotion: string | null;
	toneUsed: string | null;
}

/** Shape returned by `sessions.listForTimeline` per enriched session. */
type TimelineSession = {
	_id: string;
	mirrorText: string;
	entryType: string;
	hasMirrorAudio: boolean;
	primaryEmotion: string | null;
	granularLabel: string | null;
	pathChosen: string | null;
	toneUsed: string | null;
	confirmationState: string | null;
	createdAt: number;
};

/** Maps a `listForTimeline` result row to the client-side `TimelineEntry` shape. */
export function toTimelineEntry(session: TimelineSession): TimelineEntry {
	return {
		confirmationState: session.confirmationState,
		createdAt: session.createdAt,
		entryType: session.entryType,
		granularLabel: session.granularLabel,
		hasMirrorAudio: session.hasMirrorAudio,
		id: session._id,
		mirrorText: session.mirrorText,
		pathChosen: session.pathChosen,
		primaryEmotion: session.primaryEmotion,
		toneUsed: session.toneUsed,
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
