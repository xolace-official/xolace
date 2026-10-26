import type { LibraryEntry, LibrarySource } from "./types";

// The rules `library/ingest.ts` and `library/admin.ts` already enforce, checked in the
// UI so an editor sees what blocks Publish before the mutation rejects it.

export interface PublishGate {
	/** Shown under the label when the gate fails. */
	help: string;
	id: string;
	label: string;
	/** `false` = a soft warning; Publish still works. */
	required: boolean;
	state: "pass" | "fail";
}

const DAY_MS = 86_400_000;

// Same pattern as packages/backend/convex/library/imageAlts.ts.
const MD_IMAGE = /!\[([^\]]*)\](?:\(\s*<?([^)\s>]+)|\[([^\]]*)\])/g;

/** Images in the body with no alt text (decorative ones excluded). */
export function imagesMissingAlt(
	markdown: string,
	decorative: readonly string[] = []
) {
	const missing: string[] = [];
	for (const [, alt, src, ref] of markdown.matchAll(MD_IMAGE)) {
		const target = src ?? ref ?? "";
		if (!(alt?.trim() || decorative.includes(target))) {
			missing.push(target);
		}
	}
	return missing;
}

export function publishGates({
	entry,
	body,
	sources,
	now,
}: {
	entry: LibraryEntry;
	body: string;
	sources: readonly LibrarySource[];
	now: number;
}): PublishGate[] {
	const gates: PublishGate[] = [
		{
			help: "Every entry needs a title and a one-line dek.",
			id: "copy",
			label: "Title and dek",
			required: true,
			state: entry.title.trim() && entry.dek.trim() ? "pass" : "fail",
		},
		{
			help: "Credit at least one source, even for originals (Xolace).",
			id: "credits",
			label: "Source credits",
			required: true,
			state: entry.credits.length > 0 ? "pass" : "fail",
		},
	];

	const missingAlt = imagesMissingAlt(body);
	gates.push({
		help:
			missingAlt.length > 0
				? `${missingAlt.length} image${missingAlt.length === 1 ? "" : "s"} without alt text: ${missingAlt.join(", ")}`
				: "Every non-decorative image needs alt text.",
		id: "alt",
		label: "Image alt text",
		required: true,
		state: missingAlt.length === 0 ? "pass" : "fail",
	});

	if (entry.kind === "explainer") {
		gates.push({
			help: "An explainer goes live only after someone signs off a safety review of its current body.",
			id: "safety",
			label: "Safety review",
			required: true,
			state: entry.safetyReviewedAt ? "pass" : "fail",
		});
	}

	if (entry.kind === "story") {
		gates.push({
			help: "Record the storyteller's consent before the story goes live.",
			id: "consent",
			label: "Storyteller consent",
			required: true,
			state: entry.consentRecordedAt ? "pass" : "fail",
		});
	}

	if (entry.reuse === "verbatim") {
		const stale = entry.credits.some((credit) => {
			const days = sources.find((s) => s.slug === credit.source)?.refreshDays;
			const retrieved = credit.retrievedAt ?? entry.retrievedAt;
			return days && retrieved && now - retrieved > days * DAY_MS;
		});
		gates.push({
			help: "A verbatim source is past its refresh window. Re-check the page before publishing.",
			id: "refresh",
			label: "Source is fresh",
			required: false,
			state: stale ? "fail" : "pass",
		});
	}

	return gates;
}

export function blockingGates(gates: readonly PublishGate[]) {
	return gates.filter((gate) => gate.required && gate.state === "fail");
}
