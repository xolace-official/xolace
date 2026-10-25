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

export type TimelineFlatItem =
	| { type: "section"; id: string; label: string }
	| { type: "entry"; id: string; entry: TimelineEntry };
