import { api } from "@xolace/backend/convex/_generated/api";
import { useQuery } from "convex/react";

export type AvatarOption = {
	key: string;
	tier: "free" | "premium";
	label: string;
	order: number;
	isDefault: boolean;
	url: string;
};

/** The curated avatar catalog. Undefined while loading. */
export function useAvatars(): AvatarOption[] | undefined {
	return useQuery(api.avatars.listAvatars) as AvatarOption[] | undefined;
}

/** Avatar for a stored key: the matching row, else the catalog default, else
 * the first row. Null until the catalog loads. */
export function resolveAvatar(
	avatars: AvatarOption[] | undefined,
	avatarId: string | null | undefined
): AvatarOption | null {
	if (!avatars || avatars.length === 0) {
		return null;
	}
	return (
		avatars.find((a) => a.key === avatarId) ??
		avatars.find((a) => a.isDefault) ??
		avatars[0]
	);
}
