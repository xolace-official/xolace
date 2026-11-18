import { createContext, type ReactNode, use } from "react";
import type { ThemeMode as Scheme } from "@/design/themes";
import type {
	ProfileRow,
	ThemeCard,
	ThemeMode,
} from "@/features/settings/appearance/appearance-model";
import { useAppearance } from "@/features/settings/appearance/use-appearance";
import type { MotionPreference } from "@/lib/motion/use-effective-reduced-motion";
import type { ProfileCardId } from "@/store/store";

/**
 * Everything Settings › Appearance reads and does. Two adapters fill it: the app's
 * (`AppearanceData`: the store, Uniwind, Convex) and fixtures in its dev states (`dev/`).
 */
export type Appearance = {
	state: {
		mode: ThemeMode;
		modeNote: string;
		themes: ThemeCard[];
		/** The strip's first scroll offset, so the active card is in view. */
		themeStart: number;
		/** Each preview is drawn in its own theme, in the mode the app shows now. */
		previewScheme: Scheme;
		themeNote: string;
		motion: MotionPreference;
		motionNote: string;
		nightMode: boolean;
		profileCards: ProfileRow[];
		/** The Replay intro alert. */
		replayOpen: boolean;
	};
	actions: {
		setMode: (mode: ThemeMode) => void;
		/** A locked Plus theme opens the paywall instead. */
		pickTheme: (id: string) => void;
		setMotion: (motion: MotionPreference) => void;
		setNightMode: (on: boolean) => void;
		showProfileCard: (id: ProfileCardId, show: boolean) => void;
		setReplayOpen: (open: boolean) => void;
		replayIntro: () => void;
	};
};

const AppearanceContext = createContext<Appearance | null>(null);

export function AppearanceProvider({
	value,
	children,
}: {
	value: Appearance;
	children: ReactNode;
}) {
	return <AppearanceContext value={value}>{children}</AppearanceContext>;
}

/** The app's adapter. */
export function AppearanceData({ children }: { children: ReactNode }) {
	return (
		<AppearanceProvider value={useAppearance()}>{children}</AppearanceProvider>
	);
}

export function useAppearanceScreen(): Appearance {
	const appearance = use(AppearanceContext);
	if (!appearance) {
		throw new Error("useAppearanceScreen needs an AppearanceProvider above it");
	}
	return appearance;
}
