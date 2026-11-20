import { createContext, type ReactNode, use } from "react";
import type {
	BadgesView,
	BadgeView,
	FreezeView,
} from "@/features/achievements/badges/badges-model";
import { useBadges } from "@/features/achievements/badges/use-badges";

export type Badges = {
	state: {
		view: BadgesView | undefined;
		freeze: FreezeView | undefined;
		buying: boolean;
	};
	actions: {
		togglePin: (badge: BadgeView) => void;
		share: (badge: BadgeView) => void;
		buyFreeze: () => void;
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
