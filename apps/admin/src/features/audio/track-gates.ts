import type { PublishGate } from "@/features/content/publish-gate";

import type { AudioTrack } from "./types";

// The rules `kindling/ingest.ts` and `upsertTrack` already enforce, checked in the UI so
// an editor sees what blocks Publish before the mutation rejects it.

const SAFETY_TIER = 3;

export function trackGates(track: AudioTrack): PublishGate[] {
	const gates: PublishGate[] = [
		{
			help: "Every track needs a title.",
			id: "title",
			label: "Title",
			required: true,
			state: track.title.trim() ? "pass" : "fail",
		},
		{
			help: "Upload a square thumbnail; Browse tiles show it.",
			id: "thumb",
			label: "Thumbnail",
			required: true,
			state: track.hasThumb ? "pass" : "fail",
		},
		{
			// Soft: 32 live prod music tracks have none, and ingest doesn't require them.
			help: "Without curated tags, recommendations can only match the title and source tags.",
			id: "tags",
			label: "Curated tags",
			required: false,
			state: track.tags.length > 0 ? "pass" : "fail",
		},
	];

	if (track.family === "music") {
		gates.push({
			help: "Music can't go live without its licence: source, licence name and link, artist.",
			id: "licence",
			label: "Licence",
			required: true,
			state:
				track.licence?.licenceName.trim() && track.licence.artist.trim()
					? "pass"
					: "fail",
		});
	}

	if (track.family === "support") {
		if ((track.tier ?? 0) >= SAFETY_TIER) {
			gates.push({
				help: `A tier ${track.tier} track goes live only after someone signs off a safety review.`,
				id: "safety",
				label: "Safety review",
				required: true,
				state: track.safetyReviewedAt ? "pass" : "fail",
			});
		}
		gates.push(
			{
				help: "The meaning index embeds what the track says. Add the transcript.",
				id: "transcript",
				label: "Transcript",
				required: false,
				state: track.transcript?.trim() ? "pass" : "fail",
			},
			{
				help: "The player credits the voice. Name the narrator.",
				id: "narrators",
				label: "Narrator",
				required: false,
				state: track.narrators?.length ? "pass" : "fail",
			}
		);
	}

	return gates;
}
