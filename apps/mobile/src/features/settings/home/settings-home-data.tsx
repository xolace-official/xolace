import { createContext, type ReactNode, use } from "react";
import type { PlusCard } from "@/features/settings/home/home-model";
import { useSettingsHome } from "@/features/settings/home/use-settings-home";

export type SettingsPage =
	| "appearance"
	| "mirror"
	| "notifications"
	| "data"
	| "account"
	| "follow";

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
		openWhatsNew: () => void;
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
