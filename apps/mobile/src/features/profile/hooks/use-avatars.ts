import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

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

/**
 * Resolve the avatar to render for a given stored key: the matching row,
 * else the catalog default (isDefault), else the first row. Null until the
 * catalog loads or if it's empty.
 */
export function resolveAvatar(
  avatars: AvatarOption[] | undefined,
  avatarId: string | null | undefined,
): AvatarOption | null {
  if (!avatars || avatars.length === 0) return null;
  return (
    avatars.find((a) => a.key === avatarId) ??
    avatars.find((a) => a.isDefault) ??
    avatars[0]
  );
}
