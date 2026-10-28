import type {
	TimelineEntry,
	TimelineFlatItem,
} from "@/features/timeline/types";

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

/** Relative day label: Today, Yesterday, "X days ago" under a week, else "Jan 3". */
function getRelativeLabel(timestamp: number): string {
	const now = new Date();
	const date = new Date(timestamp);
	const nowUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
	const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
	const diffDays = Math.floor((nowUtc - dateUtc) / 86_400_000);

	if (diffDays <= 0) {
		return "Today";
	}
	if (diffDays === 1) {
		return "Yesterday";
	}
	if (diffDays < 7) {
		return `${diffDays} days ago`;
	}

	return new Intl.DateTimeFormat("en-US", {
		day: "numeric",
		month: "short",
	}).format(date);
}

/** Groups newest-first entries into flat items, a section item before each relative-date run. */
export function buildTimelineSections(
	entries: TimelineEntry[]
): TimelineFlatItem[] {
	const result: TimelineFlatItem[] = [];
	let lastLabel = "";

	for (const entry of entries) {
		const label = getRelativeLabel(entry.createdAt);

		if (label !== lastLabel) {
			result.push({ id: `section-${label}`, label, type: "section" });
			lastLabel = label;
		}

		result.push({ entry, id: entry.id, type: "entry" });
	}

	return result;
}
