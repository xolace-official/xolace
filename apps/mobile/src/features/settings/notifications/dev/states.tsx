/** Settings › Notifications on fixtures: `xolace://dev/settings/<id>` (handoff settings.md §9–§10). */
import type { DevState } from "@/dev/dev-state";
import { FixtureNotifications } from "@/features/settings/notifications/dev/fixture-notifications";
import {
	NOTIFY_BLOCKED,
	NOTIFY_BLOCKED_ALERT,
	NOTIFY_DAILY_QUOTE_OFF,
	NOTIFY_DAILY_QUOTE_PAUSED,
	NOTIFY_DIRECT_10PM,
	NOTIFY_HELD,
	NOTIFY_LETTERS_OFF,
	NOTIFY_LOADING,
	NOTIFY_QUIET_OFF,
	NOTIFY_QUIET_VOICE,
	NOTIFY_REACH_PUSH,
	NOTIFY_REACH_TELEGRAM,
	NOTIFY_REMINDERS_OFF,
} from "@/features/settings/notifications/dev/fixtures";

/** The real route's header (`settings/_layout.tsx`). */
const OPTIONS = { title: "Notifications" };

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "notifications-held",
		options: OPTIONS,
		Screen: () => <FixtureNotifications state={NOTIFY_HELD} />,
		title: "Notifications: Warm, held by quiet hours",
	},
	{
		id: "notifications-daily-quote-off",
		options: OPTIONS,
		Screen: () => <FixtureNotifications state={NOTIFY_DAILY_QUOTE_OFF} />,
		title: "Notifications: the daily quote off (B19)",
	},
	{
		id: "notifications-daily-quote-paused",
		options: OPTIONS,
		Screen: () => <FixtureNotifications state={NOTIFY_DAILY_QUOTE_PAUSED} />,
		title: "Notifications: the daily quote paused after unopened ones",
	},
	{
		id: "notifications-letters-off",
		options: OPTIONS,
		Screen: () => <FixtureNotifications state={NOTIFY_LETTERS_OFF} />,
		title: "Notifications: letters' pushes off (Letters, S20)",
	},
	{
		id: "notifications-direct-10pm",
		options: OPTIONS,
		Screen: () => <FixtureNotifications state={NOTIFY_DIRECT_10PM} />,
		title: "Notifications: Direct, quiet from 10 pm (delivered)",
	},
	{
		id: "notifications-quiet-open",
		options: OPTIONS,
		Screen: () => (
			<FixtureNotifications open="before" state={NOTIFY_DIRECT_10PM} />
		),
		title: "Notifications: Not before open",
	},
	{
		id: "notifications-after-open",
		options: OPTIONS,
		Screen: () => <FixtureNotifications open="after" state={NOTIFY_HELD} />,
		title: "Notifications: Not after open",
	},
	{
		id: "notifications-reach-quiet",
		options: OPTIONS,
		Screen: () => <FixtureNotifications state={NOTIFY_QUIET_VOICE} />,
		title: "Notifications: the Quiet voice",
	},
	{
		id: "notifications-quiet-off",
		options: OPTIONS,
		Screen: () => <FixtureNotifications state={NOTIFY_QUIET_OFF} />,
		title: "Notifications: quiet hours off",
	},
	{
		id: "notifications-reminders-off",
		options: OPTIONS,
		Screen: () => <FixtureNotifications state={NOTIFY_REMINDERS_OFF} />,
		title: "Notifications: gentle reminders off",
	},
	{
		id: "notifications-blocked",
		options: OPTIONS,
		Screen: () => <FixtureNotifications state={NOTIFY_BLOCKED} />,
		title: "Notifications: the phone blocks them",
	},
	{
		id: "notifications-blocked-alert",
		options: OPTIONS,
		Screen: () => <FixtureNotifications state={NOTIFY_BLOCKED_ALERT} />,
		title: "Notifications: blocked, after a switch tap",
	},
	{
		id: "notifications-reach-telegram",
		options: OPTIONS,
		Screen: () => <FixtureNotifications state={NOTIFY_REACH_TELEGRAM} />,
		title: "Notifications: Reach me on…, Telegram linked",
	},
	{
		id: "notifications-reach-push",
		options: OPTIONS,
		Screen: () => <FixtureNotifications state={NOTIFY_REACH_PUSH} />,
		title: "Notifications: Reach me on…, Telegram not linked",
	},
	{
		id: "notifications-loading",
		options: OPTIONS,
		Screen: () => <FixtureNotifications state={NOTIFY_LOADING} />,
		title: "Notifications while preferences load",
	},
];
