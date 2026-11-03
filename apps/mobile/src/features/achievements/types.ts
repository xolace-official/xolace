import type { api } from "@xolace/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

export type AchievementsOverview = FunctionReturnType<
	typeof api.achievements.display.overview
>;
export type AchievementView = NonNullable<
	FunctionReturnType<typeof api.achievements.display.get>
>;
export type AchievementProgress = NonNullable<AchievementView["progress"]>;
export type UnlockedBadge = FunctionReturnType<
	typeof api.achievements.unlock.unseen
>[number];
export type BackfillSummary = NonNullable<
	FunctionReturnType<typeof api.achievements.firstSight.summary>
>;
export type SparkShelf = FunctionReturnType<
	typeof api.achievements.display.shelf
>;
