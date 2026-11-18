import { createContext, type ReactNode, use } from "react";
import type { PlusCard } from "@/features/settings/home/home-model";
import { useSettingsHome } from "@/features/settings/home/use-settings-home";

/** The pages the main screen opens, as `/settings/<page>`. */
export type SettingsPage =
	| "appearance"
	| "mirror"
	| "notifications"
	| "data"
	| "account"
	| "follow";

/**
 * Everything Settings' main screen reads and does. Two adapters fill it: Convex in the app
 * (`SettingsHomeData`) and fixtures in its dev states (`dev/`). A value that is undefined is
 * still loading, and its row shows none.
 */
export type SettingsHome = {
	state: {
		plus: PlusCard;
		mode: string;
		tone: string | undefined;
		notifications: string | undefined;
		signIn: string | undefined;
		update: { label: string; value: string };
		version: string;
	};
	actions: {
		open: (page: SettingsPage) => void;
		openPlus: () => void;
		checkForUpdates: () => void;
	};
};

const SettingsHomeContext = createContext<SettingsHome | null>(null);

export function SettingsHomeProvider({
	value,
	children,
}: {
	value: SettingsHome;
	children: ReactNode;
}) {
	return <SettingsHomeContext value={value}>{children}</SettingsHomeContext>;
}

/** The app's adapter. */
export function SettingsHomeData({ children }: { children: ReactNode }) {
	return (
		<SettingsHomeProvider value={useSettingsHome()}>
			{children}
		</SettingsHomeProvider>
	);
}

export function useSettingsHomeScreen(): SettingsHome {
	const home = use(SettingsHomeContext);
	if (!home) {
		throw new Error(
			"useSettingsHomeScreen needs a SettingsHomeProvider above it"
		);
	}
	return home;
}
