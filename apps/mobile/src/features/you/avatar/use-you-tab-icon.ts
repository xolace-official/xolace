/**
 * The You tab's icon from someone's avatar (`avatars.listAvatars` and the summary's
 * `avatarId`), redrawn when the avatar or the accent changes. Null until it's drawn, or if it
 * can't be: the tab keeps its person glyph then.
 */
import { api } from "@xolace/backend/api";
import { useQuery } from "convex/react";
import type { NativeTabsTriggerIconProps } from "expo-router/native-tabs";
import { useEffect, useState } from "react";
import { avatarTabIcons } from "@/features/you/avatar/tab-icon";
import { resolveAvatar } from "@/features/you/avatar-model";
import { useProfileSummary } from "@/lib/profile-summary";
import { useTokenColor } from "@/lib/use-token-color";

export function useYouTabIcon(): NativeTabsTriggerIconProps | null {
	const summary = useProfileSummary();
	const avatars = useQuery(api.avatars.listAvatars);
	const accent = useTokenColor("accent");
	const url = resolveAvatar(avatars, summary?.avatarId)?.url;
	// The last one drawn stays up while a new avatar draws, so the tab never flashes the glyph.
	const [icon, setIcon] = useState<NativeTabsTriggerIconProps | null>(null);

	useEffect(() => {
		if (!url) {
			return;
		}
		let alive = true;
		avatarTabIcons(url, accent)
			.then((icons) => {
				if (alive && icons) {
					setIcon({
						renderingMode: "original",
						src: { default: icons.plain, selected: icons.selected },
					});
				}
			})
			.catch(() => undefined);
		return () => {
			alive = false;
		};
	}, [url, accent]);

	return icon;
}
