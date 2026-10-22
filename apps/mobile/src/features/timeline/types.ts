export interface TimelineEntry {
  id: string;
  mirrorText: string;
  entryType: string;
  hasMirrorAudio: boolean;
  primaryEmotion: string | null;
  granularLabel: string | null;
  pathChosen: string | null;
  toneUsed: string | null;
  confirmationState: string | null;
  createdAt: number;
}

export type TimelineFlatItem =
  | { type: "section"; id: string; label: string }
  | { type: "entry"; id: string; entry: TimelineEntry };
