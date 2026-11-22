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

export type Appearance = {
	state: {
		mode: ThemeMode;
		modeNote: string;
		themes: ThemeCard[];
		themeStart: number;
		previewScheme: Scheme;
		themeNote: string;
		motion: MotionPreference;
		motionNote: string;
		nightMode: boolean;
		profileCards: ProfileRow[];
		replayOpen: boolean;
	};
	actions: {
		setMode: (mode: ThemeMode) => void;
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
