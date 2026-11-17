import { createContext, type ReactNode, use } from "react";
import type {
	BadgesView,
	BadgeView,
	FreezeView,
} from "@/features/achievements/badges/badges-model";
import { useBadges } from "@/features/achievements/badges/use-badges";

/**
 * Everything the Achievements screen and its badge page read and do. Two
 * adapters fill it: Convex in the app (`BadgesData`) and fixtures in its dev
 * states (`dev/states.tsx`). No part calls the data hook itself, so a dev state
 * is the whole screen, page included, and a tap in one never reaches the backend.
 */
export type Badges = {
	state: {
		/** The categories and the sparks card; undefined while the overview loads. */
		view: BadgesView | undefined;
		/** The freeze card at the foot; undefined while the shelf loads. */
		freeze: FreezeView | undefined;
		buying: boolean;
	};
	actions: {
		/** Pin or unpin an earned badge; a fourth pin is refused with a toast. */
		togglePin: (badge: BadgeView) => void;
		/** The system share sheet with the badge's title and date. */
		share: (badge: BadgeView) => void;
		buyFreeze: () => void;
		/** A deep link named a badge the screen doesn't list. */
		missing: () => void;
	};
};

const BadgesContext = createContext<Badges | null>(null);

export function BadgesProvider({
	value,
	children,
}: {
	value: Badges;
	children: ReactNode;
}) {
	return <BadgesContext value={value}>{children}</BadgesContext>;
}

/** The app's adapter: the screen on Convex. */
export function BadgesData({ children }: { children: ReactNode }) {
	return <BadgesProvider value={useBadges()}>{children}</BadgesProvider>;
}

export function useBadgesScreen(): Badges {
	const value = use(BadgesContext);
	if (!value) {
		throw new Error("useBadgesScreen needs a BadgesProvider above it");
	}
	return value;
}
