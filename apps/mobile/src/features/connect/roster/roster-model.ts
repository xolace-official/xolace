/** The Xolacers roster: the directory, the person's own chats and a filter in, the filter chips
 * and the cards out. Pure. */
import type { api } from "@xolace/backend/api";
import {
	SPECIALTIES,
	specialtyLabel,
} from "@xolace/backend/convex/lib/specialties";
import type { FunctionReturnType } from "convex/server";
import { COPY } from "../copy";
import type { ConversationRow } from "../list/chats-model";

export type DirectoryRow = FunctionReturnType<
	typeof api.xolacerChat.directory
>[number];

export type FilterChip = { slug: string | null; label: string };

export type RosterCard = {
	id: DirectoryRow["xolacerProfileId"];
	name: string;
	photoUrl?: string;
	present: boolean;
	/** Presence as a word: here now, replies within a day, or full. */
	presence: string;
	/** "★ 4.9", or null for someone under the rating threshold (they get "New Xolacer"). */
	rating: string | null;
	/** An open chat with them already. */
	talking: boolean;
	bio: string;
	tags: string[];
	/** At capacity: still listed, stepped back. */
	muted: boolean;
	a11y: string;
};

/** Fewer offered than this and the chip row isn't worth showing (production's rule). */
const MIN_FILTERS = 2;

/** Everyone, then every specialty someone on the roster declares, in the taxonomy's order; none
 * when fewer than two are offered. An active filter is always offered, or a routed specialty
 * nobody declares leaves no way back. */
export function filterChips(
	directory: readonly DirectoryRow[],
	active: string | null
): FilterChip[] {
	const offered = new Set<string>(directory.flatMap((x) => x.specialties));
	if (active) {
		offered.add(active);
	}
	if (offered.size < MIN_FILTERS) {
		return [];
	}
	return [
		{ label: COPY.roster.everyone, slug: null },
		...SPECIALTIES.filter((s) => offered.has(s.slug)).map((s) => ({
			label: s.label,
			slug: s.slug as string,
		})),
	];
}

function presenceWord(x: DirectoryRow): string {
	if (x.atCapacity) {
		return COPY.roster.full;
	}
	return x.present ? COPY.roster.hereNow : COPY.roster.repliesInADay;
}

/** The cards: filtered by specialty, then present people first by the frozen snapshot (so a
 * reactive re-sort never slides a card from under a tap). The presence word reads live. */
export function rosterCards(
	directory: readonly DirectoryRow[],
	conversations: readonly ConversationRow[],
	filter: string | null,
	presentSnapshot: ReadonlySet<string> | null
): RosterCard[] {
	const talkingWith = new Set<string>(
		conversations.flatMap((c) =>
			c.kind === "pair" && c.role === "user" && c.status === "open"
				? [c.xolacerProfileId]
				: []
		)
	);
	const visible = filter
		? directory.filter((x) => (x.specialties as string[]).includes(filter))
		: [...directory];
	const ranked = presentSnapshot
		? visible.sort(
				(a, b) =>
					Number(presentSnapshot.has(b.xolacerProfileId)) -
					Number(presentSnapshot.has(a.xolacerProfileId))
			)
		: visible;
	return ranked.map((x) => {
		const presence = presenceWord(x);
		const talking = talkingWith.has(x.xolacerProfileId);
		return {
			a11y: COPY.roster.card({
				bio: x.bio,
				name: x.displayName,
				presence,
				rating:
					x.rating === undefined
						? COPY.roster.newXolacer
						: COPY.roster.ratingA11y(x.rating, x.ratingCount),
				talking,
			}),
			bio: x.bio,
			id: x.xolacerProfileId,
			muted: x.atCapacity,
			name: x.displayName,
			photoUrl: x.photoUrl,
			presence,
			present: x.present,
			rating: x.rating === undefined ? null : COPY.roster.rating(x.rating),
			tags: x.specialties.map(specialtyLabel),
			talking,
		};
	});
}

/** The ids present right now: the snapshot the roster freezes while it's on screen. */
export const presentIds = (directory: readonly DirectoryRow[]) =>
	new Set<string>(
		directory.filter((x) => x.present).map((x) => x.xolacerProfileId)
	);
