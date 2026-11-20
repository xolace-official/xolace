import { api } from "@xolace/backend/api";
import { useMutation, useQuery } from "convex/react";
import { usePaywall } from "@/features/purchases/use-paywall";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import type { AvatarSheetData } from "@/features/you/avatar/avatar-data";
import { isLocked, resolveAvatar } from "@/features/you/avatar-model";
import { playAffirmativePress } from "@/lib/haptics";
import { useProfileSummary } from "@/lib/profile-summary";

export function useAvatarSheet(): AvatarSheetData {
	const avatars = useQuery(api.avatars.listAvatars);
	const summary = useProfileSummary();
	const { isPlus } = usePlusEntitlement();
	const openPaywall = usePaywall((s) => s.open);
	const setAvatar = useMutation(api.avatars.setAvatar);
	const current = resolveAvatar(avatars, summary?.avatarId);

	const pick: AvatarSheetData["actions"]["pick"] = (avatar) => {
		if (isLocked(avatar, isPlus)) {
			openPaywall("premium_avatar");
			return false;
		}
		playAffirmativePress();
		if (avatar.key !== current?.key) {
			setAvatar({ key: avatar.key }).catch(() => undefined);
		}
		return true;
	};

	return { actions: { pick }, state: { avatars, current, isPlus } };
}
