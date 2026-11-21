import {
	type AchievementView,
	type Art,
	artOf,
	type Family,
	familyOfId,
	longDate,
} from "@/features/achievements/achievements-model";
import { COPY } from "@/features/achievements/copy";

/** The card is square: drawn at 360 × 360 pt and saved at 1080 × 1080, a post or a chat image. */
export const CARD = { height: 360, width: 360 } as const;
export const CARD_PX = { height: 1080, width: 1080 } as const;

export type BadgeCard = {
	id: string;
	title: string;
	art: Art;
	family: Family;
	/** "Unlocked on 21 November 2026". */
	date: string;
	/** The display name, only when the person chose to include it. */
	name: string | null;
	/** What the share sheet says when the image can't go (and on Android, its title). */
	message: string;
	label: string;
};

type Earnable = Pick<
	AchievementView,
	"achievementId" | "title" | "art" | "earnedAt"
>;

/** A badge can be shared once it is unlocked; a locked one has nothing to show for yet. */
export const canShareBadge = (b: { earnedAt?: number }) =>
	b.earnedAt !== undefined;

/** The name the toggle offers: the display name, trimmed, or none to offer. */
export function offeredName(displayName: string | null | undefined) {
	const name = displayName?.trim();
	return name ? name : null;
}

/**
 * What the card shows for an unlocked badge, or null for a locked or missing one. The name is
 * off unless the person turned it on: Xolace is anonymous by default.
 */
export function badgeCard(
	badge: Earnable | null | undefined,
	opts: { displayName?: string | null; includeName: boolean; locale?: string }
): BadgeCard | null {
	if (!badge || badge.earnedAt === undefined) {
		return null;
	}
	const date = longDate(badge.earnedAt, opts.locale);
	const name = opts.includeName ? offeredName(opts.displayName) : null;
	return {
		art: artOf(badge.art),
		date: COPY.card.unlockedOn(date),
		family: familyOfId(badge.achievementId),
		id: badge.achievementId,
		label: COPY.card.image(badge.title, date, name),
		message: COPY.badge.shareMessage(badge.title, date),
		name,
		title: badge.title,
	};
}

/** The off-screen card's scale, so it is drawn at 1080 px wide on any screen density. */
export const captureScale = (pixelRatio: number) =>
	CARD_PX.width / (CARD.width * pixelRatio);
