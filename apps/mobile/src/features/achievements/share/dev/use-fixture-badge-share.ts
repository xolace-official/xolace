import { useState } from "react";
import { Share } from "react-native";
import { fixtureArt } from "@/features/achievements/dev/fixture-art";
import { OVERVIEW } from "@/features/achievements/dev/fixtures";
import { shareBadgeCard } from "@/features/achievements/share/badge-card-file";
import {
	badgeCard,
	offeredName,
} from "@/features/achievements/share/badge-card-model";
import type { BadgeShare } from "@/features/achievements/share/badge-share-data";

/** The display names Xolace seeds look like this; the fixture's is one of them. */
const FIXTURE_NAME = "Quiet Fern";
const EARNED = Date.UTC(2026, 10, 4, 12);

const find = (id: string) =>
	OVERVIEW.categories
		.flatMap((c) => c.achievements)
		.find((a) => a.achievementId === id);

/**
 * The sheet on fixtures. Share is real (a capture and the system share sheet, both on the
 * phone): the share-sheet proof needs the tap, and nothing reaches the backend.
 */
export function useFixtureBadgeShare(
	id: string,
	opts: { named?: boolean; displayName?: string | null } = {}
): BadgeShare {
	const [includeName, setIncludeName] = useState(opts.named ?? false);
	const [sharing, setSharing] = useState(false);
	const raw = find(id);
	const displayName =
		opts.displayName === undefined ? FIXTURE_NAME : opts.displayName;
	const base = badgeCard(raw && { ...raw, earnedAt: raw.earnedAt ?? EARNED }, {
		displayName,
		includeName,
	});
	const card = base && {
		...base,
		art: { ...base.art, source: fixtureArt(id) },
	};
	const share = () => {
		if (!card || sharing) {
			return;
		}
		setSharing(true);
		shareBadgeCard(card.message)
			.catch(() => Share.share({ message: card.message }))
			.catch(() => undefined)
			.finally(() => setSharing(false));
	};
	return {
		actions: { setIncludeName, share },
		state: { card, includeName, name: offeredName(displayName), sharing },
	};
}
