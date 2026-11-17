/** The curated avatars (`avatars.listAvatars`): which one is someone's, and which are locked. */
import type { api } from "@xolace/backend/api";
import type { FunctionReturnType } from "convex/server";

export type AvatarOption = FunctionReturnType<
	typeof api.avatars.listAvatars
>[number];

/** Avatar for a stored key: the matching row, else the catalog default, else the first row.
 * Null until the catalog loads, or when it's empty. */
export function resolveAvatar(
	avatars: readonly AvatarOption[] | undefined,
	avatarId: string | null | undefined
): AvatarOption | null {
	if (!avatars || avatars.length === 0) {
		return null;
	}
	return (
		avatars.find((a) => a.key === avatarId) ??
		avatars.find((a) => a.isDefault) ??
		avatars[0] ??
		null
	);
}

/** Xolace+ avatars are locked for free users (the server refuses them too). */
export const isLocked = (avatar: AvatarOption, isPlus: boolean) =>
	avatar.tier === "premium" && !isPlus;
