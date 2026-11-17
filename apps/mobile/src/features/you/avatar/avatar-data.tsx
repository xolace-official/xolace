import { createContext, type ReactNode, use } from "react";
import { useAvatarSheet } from "@/features/you/avatar/use-avatar-sheet";
import type { AvatarOption } from "@/features/you/avatar-model";

/**
 * The avatar sheet's reads and taps. Filled from Convex by `AvatarData` and from fixtures by its
 * dev states; the sheet can't tell which.
 */
export type AvatarSheetData = {
	state: {
		/** The catalog; undefined while it loads. */
		avatars: readonly AvatarOption[] | undefined;
		current: AvatarOption | null;
		isPlus: boolean;
	};
	actions: {
		/** Make it someone's avatar. True when it was taken (the sheet then closes). */
		pick: (avatar: AvatarOption) => boolean;
	};
};

const AvatarContext = createContext<AvatarSheetData | null>(null);

export function AvatarProvider({
	value,
	children,
}: {
	value: AvatarSheetData;
	children: ReactNode;
}) {
	return <AvatarContext value={value}>{children}</AvatarContext>;
}

/** The app's adapter: the sheet on Convex. */
export function AvatarData({ children }: { children: ReactNode }) {
	return <AvatarProvider value={useAvatarSheet()}>{children}</AvatarProvider>;
}

export function useAvatar(): AvatarSheetData {
	const value = use(AvatarContext);
	if (!value) {
		throw new Error("useAvatar needs an AvatarProvider above it");
	}
	return value;
}
