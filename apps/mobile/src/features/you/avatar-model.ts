import type { api } from "@xolace/backend/api";
import type { FunctionReturnType } from "convex/server";

export type AvatarOption = FunctionReturnType<
	typeof api.avatars.listAvatars
>[number];

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

export const isLocked = (avatar: AvatarOption, isPlus: boolean) =>
	avatar.tier === "premium" && !isPlus;
