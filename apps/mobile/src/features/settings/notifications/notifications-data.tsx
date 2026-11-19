import { createContext, type ReactNode, use } from "react";
import type { Reach } from "@/features/settings/notifications/copy";
import type { Quiet } from "@/features/settings/notifications/notifications-model";
import { useNotifications } from "@/features/settings/notifications/use-notifications";
import type { ComposedSwitch } from "@/features/settings/settings-switch-row";

/**
 * The "Reach me on…" row, composed in by the route (it reads the `reach-me-on` flag and
 * channels): its value, where check-ins go now. Null hides the Check-ins section.
 */
export type ReachMeOn = { value: string };

/**
 * Everything Settings › Notifications reads and does. Two adapters fill it: Convex and the OS
 * permission in the app (`NotificationsData`), fixtures in its dev states (`dev/`).
 */
export type Notifications = {
	state: {
		/** Preferences haven't arrived yet. */
		loading: boolean;
		/** The phone blocks notifications for Xolace (the OS permission, re-read on foreground). */
		blocked: boolean;
		/** As shown: off while the phone blocks them. */
		reminders: boolean;
		chat: boolean;
		/** Letters' push switch (composed in by the route): off while the phone blocks it; null
		 * while it, or the screen, loads. */
		letters: boolean | null;
		reach: Reach;
		quiet: Quiet | null;
		reachMeOn: ReachMeOn | null;
		/** The "can't be turned on from here" alert, after a switch met a blocked phone. */
		alertOpen: boolean;
	};
	actions: {
		setReminders: (on: boolean) => void;
		setChat: (on: boolean) => void;
		setLetters: (on: boolean) => void;
		setReach: (reach: Reach) => void;
		setQuiet: (on: boolean) => void;
		setQuietHour: (end: "after" | "before", hour: number) => void;
		openReachMeOn: () => void;
		/** The phone's settings for Xolace (closes the alert). */
		openSettings: () => void;
		closeAlert: () => void;
	};
};

const NotificationsContext = createContext<Notifications | null>(null);

export function NotificationsProvider({
	value,
	children,
}: {
	value: Notifications;
	children: ReactNode;
}) {
	return <NotificationsContext value={value}>{children}</NotificationsContext>;
}

/** The app's adapter. */
export function NotificationsData({
	reachMeOn,
	letters,
	children,
}: {
	reachMeOn: ReachMeOn | null;
	letters: ComposedSwitch;
	children: ReactNode;
}) {
	return (
		<NotificationsProvider value={useNotifications(reachMeOn, letters)}>
			{children}
		</NotificationsProvider>
	);
}

export function useNotificationsScreen(): Notifications {
	const value = use(NotificationsContext);
	if (!value) {
		throw new Error(
			"useNotificationsScreen needs a NotificationsProvider above it"
		);
	}
	return value;
}
