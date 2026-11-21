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

export type Family = "night" | "dawn" | "green" | "teal" | "aurora";

const FAMILY_OF: Record<Category, Family> = {
	exploring: "green",
	getting_started: "teal",
	showing_up: "dawn",
	streak: "night",
	understanding: "aurora",
};

export const familyOf = (category: Category): Family => FAMILY_OF[category];

const FAMILY_BY_PREFIX: readonly [prefix: string, family: Family][] = [
	["streak-", "night"],
	["showing-up-", "dawn"],
	["understanding-", "aurora"],
	["joined", "teal"],
	["first-session", "teal"],
];

export function familyOfId(achievementId: string): Family {
	const hit = FAMILY_BY_PREFIX.find(([prefix]) =>
		achievementId.startsWith(prefix)
	);
	return hit?.[1] ?? "green";
}

export const familyTokens = (family: Family, dark: boolean) => ({
	flood: `badge-${family}-${dark ? "dusk" : "day"}`,
	glow: `badge-${family}-glow`,
});

export const progressLabel = ({ current, target, unit }: AchievementProgress) =>
	`${current} of ${target} ${unit}`;

export const progressShare = ({ current, target }: AchievementProgress) =>
	target > 0 ? Math.min(1, current / target) : 0;

export const longDate = (at: number, locale?: string) =>
	new Date(at).toLocaleDateString(locale, {
		day: "numeric",
		month: "long",
		year: "numeric",
	});

export const shortDate = (at: number, locale?: string) =>
	new Date(at).toLocaleDateString(locale, {
		day: "numeric",
		month: "short",
		year: "numeric",
	});

export const sparksLine = (sparks: number, earned: boolean) =>
	COPY.sparks(sparks, earned);
