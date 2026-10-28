import type { TimelineEntry } from "@/features/timeline/types";

const now = Date.now();
const daysAgo = (n: number) => now - n * 24 * 60 * 60 * 1000;

// TODO: replace with real data from backend/store
export const MOCK_ENTRIES: TimelineEntry[] = [
	{
		confirmationState: "confirmed",
		createdAt: daysAgo(0),
		entryType: "open_prompt",
		granularLabel: "Heaviness",
		hasMirrorAudio: false,
		id: "1",
		mirrorText:
			"There's something heavy sitting in your chest today. Not sharp — more like a weight you've been carrying so long you forgot it wasn't always there.",
		pathChosen: "exit",
		primaryEmotion: "Frustration",
		toneUsed: "adaptive",
	},
	{
		confirmationState: "confirmed",
		createdAt: daysAgo(2),
		entryType: "voice",
		granularLabel: null,
		hasMirrorAudio: true,
		id: "2",
		mirrorText: "A quiet, steady day. Solid ground.",
		pathChosen: "solo",
		primaryEmotion: "Calm",
		toneUsed: "gentle",
	},
	{
		confirmationState: "confirmed",
		createdAt: daysAgo(5),
		entryType: "open_prompt",
		granularLabel: "Resignation",
		hasMirrorAudio: false,
		id: "3",
		mirrorText:
			"A pattern you keep hoping will change. There's grief in watching something repeat itself — and still showing up anyway.",
		pathChosen: "peers",
		primaryEmotion: "Frustration",
		toneUsed: "poetic",
	},
];
