import type { TimelineEntry } from "@/src/features/timeline/types";

const now = Date.now();
const daysAgo = (n: number) => now - n * 24 * 60 * 60 * 1000;

// TODO: replace with real data from backend/store
export const MOCK_ENTRIES: TimelineEntry[] = [
  {
    id: "1",
    entryType: "open_prompt",
    hasMirrorAudio: false,
    mirrorText:
      "There's something heavy sitting in your chest today. Not sharp — more like a weight you've been carrying so long you forgot it wasn't always there.",
    primaryEmotion: "Frustration",
    granularLabel: "Heaviness",
    pathChosen: "exit",
    toneUsed: "adaptive",
    confirmationState: "confirmed",
    createdAt: daysAgo(0),
  },
  {
    id: "2",
    entryType: "voice",
    hasMirrorAudio: true,
    mirrorText: "A quiet, steady day. Solid ground.",
    primaryEmotion: "Calm",
    granularLabel: null,
    pathChosen: "solo",
    toneUsed: "gentle",
    confirmationState: "confirmed",
    createdAt: daysAgo(2),
  },
  {
    id: "3",
    entryType: "open_prompt",
    hasMirrorAudio: false,
    mirrorText:
      "A pattern you keep hoping will change. There's grief in watching something repeat itself — and still showing up anyway.",
    primaryEmotion: "Frustration",
    granularLabel: "Resignation",
    pathChosen: "peers",
    toneUsed: "poetic",
    confirmationState: "confirmed",
    createdAt: daysAgo(5),
  },
];
