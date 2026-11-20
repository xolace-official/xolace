import { createContext, type ReactNode, use } from "react";
import type { Reach } from "@/features/settings/notifications/copy";
import type {
	DailyQuote,
	DailyQuoteSlot,
	Quiet,
} from "@/features/settings/notifications/notifications-model";
import { useNotifications } from "@/features/settings/notifications/use-notifications";
import type { ComposedSwitch } from "@/features/settings/settings-switch-row";

export type ReachMeOn = { value: string };

export type Notifications = {
	state: {
		loading: boolean;
		blocked: boolean;
		reminders: boolean;
		chat: boolean;
		dailyQuote: DailyQuote;
		letters: boolean | null;
		reach: Reach;
		quiet: Quiet | null;
		reachMeOn: ReachMeOn | null;
		alertOpen: boolean;
	};
	actions: {
		setReminders: (on: boolean) => void;
		setChat: (on: boolean) => void;
		setDailyQuote: (on: boolean) => void;
		setDailyQuoteSlot: (slot: DailyQuoteSlot) => void;
		setLetters: (on: boolean) => void;
		setReach: (reach: Reach) => void;
		setQuiet: (on: boolean) => void;
		setQuietHour: (end: "after" | "before", hour: number) => void;
		openReachMeOn: () => void;
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
