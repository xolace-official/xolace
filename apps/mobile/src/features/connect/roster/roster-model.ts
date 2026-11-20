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
	presence: string;
	rating: string | null;
	talking: boolean;
	bio: string;
	tags: string[];
	muted: boolean;
	a11y: string;
};

const MIN_FILTERS = 2;

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

export const presentIds = (directory: readonly DirectoryRow[]) =>
	new Set<string>(
		directory.filter((x) => x.present).map((x) => x.xolacerProfileId)
	);

export function settleSnapshot(
	held: ReadonlySet<string> | null,
	directory: readonly DirectoryRow[] | undefined
): ReadonlySet<string> | null {
	if (directory === undefined) {
		return null;
	}
	return held ?? presentIds(directory);
}
