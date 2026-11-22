import type { api } from "@xolace/backend/api";
import type { FunctionReturnType } from "convex/server";
import type { PlusStatus } from "@/features/purchases/plus-status";

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

export type AvatarTap = "pick" | "locked" | "wait";

export function avatarTap(avatar: AvatarOption, plus: PlusStatus): AvatarTap {
	if (avatar.tier !== "premium" || plus === "plus") {
		return "pick";
	}
	return plus === "free" ? "locked" : "wait";
}

export const isLocked = (avatar: AvatarOption, plus: PlusStatus) =>
	avatarTap(avatar, plus) === "locked";
