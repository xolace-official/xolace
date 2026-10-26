import type { AudioTrack } from "@/features/audio/types";
import { FAMILY_LABEL } from "@/features/audio/types";
import type { PublishGate } from "@/features/content/publish-gate";
import type { ContentStatus } from "@/features/content/status-badge";

import type { HubItem, LibraryEntry, LibraryHub } from "../types";
import { KIND_LABEL } from "../types";

/** A hub item with what the editor shows for it. `status` is undefined when the ref is missing. */
export interface ResolvedHubItem {
	/** Stable within a hub: `${kind}:${ref}`. */
	id: string;
	item: HubItem;
	/** "Explainer", "Support audio". */
	label: string;
	status?: ContentStatus;
	title: string;
}

export function hubItemId(item: HubItem) {
	return `${item.kind}:${item.ref}`;
}

export function resolveHubItem(
	item: HubItem,
	entries: readonly LibraryEntry[],
	tracks: readonly AudioTrack[]
): ResolvedHubItem {
	const id = hubItemId(item);
	if (item.kind === "entry") {
		const entry = entries.find((e) => e.slug === item.ref);
		return {
			id,
			item,
			label: entry ? KIND_LABEL[entry.kind] : "Entry",
			status: entry?.status,
			title: entry?.title ?? item.ref,
		};
	}
	const track = tracks.find((t) => t.slug === item.ref);
	return {
		id,
		item,
		label: track ? `${FAMILY_LABEL[track.family]} audio` : "Audio",
		status: track?.status,
		title: track?.title ?? item.ref,
	};
}

// What the app needs to show a hub, checked before Publish. The schema itself only
// requires a title and intro; the rest are editorial.
export function hubGates(
	hub: LibraryHub,
	items: readonly ResolvedHubItem[]
): PublishGate[] {
	const missing = items.filter((i) => i.status === undefined);
	const notLive = items.filter(
		(i) => i.status !== undefined && i.status !== "live"
	);
	return [
		{
			help: "Every hub needs a title and a short intro.",
			id: "copy",
			label: "Title and intro",
			required: true,
			state: hub.title.trim() && hub.intro.trim() ? "pass" : "fail",
		},
		{
			help:
				missing.length > 0
					? `Remove what no longer exists: ${missing.map((i) => i.title).join(", ")}`
					: "Add at least one entry or track.",
			id: "items",
			label: "Items",
			required: true,
			state: items.length > 0 && missing.length === 0 ? "pass" : "fail",
		},
		{
			help: `${notLive.length} item${notLive.length === 1 ? " isn't" : "s aren't"} live. Readers skip ${notLive.length === 1 ? "it" : "them"} until ${notLive.length === 1 ? "it's" : "they're"} published.`,
			id: "live",
			label: "Every item is live",
			required: false,
			state: notLive.length === 0 ? "pass" : "fail",
		},
		{
			help: "Hubs show their cover large. Without one the tile is plain.",
			id: "cover",
			label: "Cover",
			required: false,
			state: hub.hasCover ? "pass" : "fail",
		},
	];
}
