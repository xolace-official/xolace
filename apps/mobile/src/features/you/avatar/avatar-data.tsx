import { createContext, type ReactNode, use } from "react";
import type { PlusStatus } from "@/features/purchases/plus-status";
import { useAvatarSheet } from "@/features/you/avatar/use-avatar-sheet";
import type { AvatarOption } from "@/features/you/avatar-model";

export type AvatarSheetData = {
	state: {
		avatars: readonly AvatarOption[] | undefined;
		current: AvatarOption | null;
		plus: PlusStatus;
	};
	actions: {
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
