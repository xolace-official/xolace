/**
 * What the badges show, from what the server sends: pure, no React, no Convex.
 * Shared by the Achievements screen (`badges/`) and the arrival (`arrival/`).
 */
import type { api } from "@xolace/backend/api";
import type { FunctionReturnType } from "convex/server";
import { COPY } from "@/features/achievements/copy";

export type AchievementsOverview = FunctionReturnType<
	typeof api.achievements.display.overview
>;
export type AchievementView = NonNullable<
	FunctionReturnType<typeof api.achievements.display.get>
>;
export type AchievementProgress = NonNullable<AchievementView["progress"]>;
export type Category = AchievementsOverview["categories"][number]["category"];
type ServerArt = AchievementView["art"];

/**
 * A badge's art as the app draws it: a remote URL from the server, or a bundled
 * image in a dev state. `unlit` is the generic fallback, never this badge's own
 * art, so it draws grey whether or not it's earned.
 */
export type Art = {
	source: string | number | null;
	thumbhash: string | null;
	unlit: boolean;
};

export const artOf = (art: ServerArt): Art => ({
	source: art.url,
	thumbhash: art.thumbhash,
	unlit: art.fallback,
});

/** Which colour a badge pours and glows with (badges §1, `FAM`). */
export type Family = "night" | "dawn" | "green" | "teal" | "aurora";

const FAMILY_OF: Record<Category, Family> = {
	exploring: "green",
	getting_started: "teal",
	showing_up: "dawn",
	streak: "night",
	understanding: "aurora",
};

export const familyOf = (category: Category): Family => FAMILY_OF[category];

/** The catalog's id prefixes (`achievements/catalog.ts`): the arrival's rows carry no category. */
const FAMILY_BY_PREFIX: readonly [prefix: string, family: Family][] = [
	["streak-", "night"],
	["showing-up-", "dawn"],
	["understanding-", "aurora"],
	["joined", "teal"],
	["first-session", "teal"],
];

/** A badge's family from its id alone; anything else is Exploring's. */
export function familyOfId(achievementId: string): Family {
	const hit = FAMILY_BY_PREFIX.find(([prefix]) =>
		achievementId.startsWith(prefix)
	);
	return hit?.[1] ?? "green";
}

/** Token names for a family's page colour (by scheme) and glow. */
export const familyTokens = (family: Family, dark: boolean) => ({
	flood: `badge-${family}-${dark ? "dusk" : "day"}`,
	glow: `badge-${family}-glow`,
});

/** "N of M {unit}": the one way progress is read out, on screen and to VoiceOver. */
export const progressLabel = ({ current, target, unit }: AchievementProgress) =>
	`${current} of ${target} ${unit}`;

/** How full a ladder's next rung is, 0–1. */
export const progressShare = ({ current, target }: AchievementProgress) =>
	target > 0 ? Math.min(1, current / target) : 0;

/** "4 November 2026": the page's date, in the reader's own order. */
export const longDate = (at: number, locale?: string) =>
	new Date(at).toLocaleDateString(locale, {
		day: "numeric",
		month: "long",
		year: "numeric",
	});

/** "4 Nov 2026": the date the back engraves. */
export const shortDate = (at: number, locale?: string) =>
	new Date(at).toLocaleDateString(locale, {
		day: "numeric",
		month: "short",
		year: "numeric",
	});

/** "+25 sparks" once earned; "25 sparks" while it's still to come. */
export const sparksLine = (sparks: number, earned: boolean) =>
	COPY.sparks(sparks, earned);
