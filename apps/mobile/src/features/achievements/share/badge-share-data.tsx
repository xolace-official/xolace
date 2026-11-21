import { createContext, type ReactNode, use } from "react";
import type { BadgeCard } from "@/features/achievements/share/badge-card-model";
import { useBadgeShare } from "@/features/achievements/share/use-badge-share";

export type BadgeShare = {
	state: {
		/** undefined while it loads, null for a locked or missing badge. */
		card: BadgeCard | null | undefined;
		/** The display name the toggle offers; null hides the toggle. */
		name: string | null;
		includeName: boolean;
		sharing: boolean;
	};
	actions: {
		setIncludeName: (on: boolean) => void;
		share: () => void;
	};
};

const BadgeShareContext = createContext<BadgeShare | null>(null);

export function BadgeShareProvider({
	value,
	children,
}: {
	value: BadgeShare;
	children: ReactNode;
}) {
	return <BadgeShareContext value={value}>{children}</BadgeShareContext>;
}

export function BadgeShareData({
	achievementId,
	children,
}: {
	achievementId: string;
	children: ReactNode;
}) {
	return (
		<BadgeShareProvider value={useBadgeShare(achievementId)}>
			{children}
		</BadgeShareProvider>
	);
}

export function useBadgeShareSheet(): BadgeShare {
	const value = use(BadgeShareContext);
	if (!value) {
		throw new Error("useBadgeShareSheet needs a BadgeShareProvider above it");
	}
	return value;
}
