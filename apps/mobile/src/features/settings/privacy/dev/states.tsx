/** Settings › Privacy & Data on fixtures: `xolace://dev/settings/<id>` (handoff settings-sections.md §8–§9). */
import type { DevState } from "@/dev/dev-state";
import {
	FixtureDeleteSheet,
	FixturePrivacy,
} from "@/features/settings/privacy/dev/fixture-privacy";
import {
	DELETE_ACCOUNT,
	DELETE_ACCOUNT_PLUS,
	DELETE_DATA,
	DELETE_DATA_BUSY,
	PRIVACY_1_YEAR_ALERT,
	PRIVACY_6_MONTHS,
	PRIVACY_6_MONTHS_ALERT,
	PRIVACY_ALERT_CAPPED,
	PRIVACY_LOADING,
	PRIVACY_MEMORY_OFF_SHARE_ON,
	PRIVACY_POLICY_OPEN,
	PRIVACY_TOP,
} from "@/features/settings/privacy/dev/fixtures";

/** The real route's header (`settings/_layout.tsx`). */
const OPTIONS = { title: "Privacy & Data" };
/** The sheet has no header of its own (`settings/_layout.tsx`); swipe back to leave. */
const DATA_SHEET = { headerShown: false, title: "Delete all my data" };
const ACCOUNT_SHEET = { headerShown: false, title: "Delete account" };

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "privacy-top",
		options: OPTIONS,
		Screen: () => <FixturePrivacy state={PRIVACY_TOP} />,
		title: "Privacy & Data (render 22)",
	},
	{
		id: "privacy-memory-off-share-on",
		options: OPTIONS,
		Screen: () => <FixturePrivacy state={PRIVACY_MEMORY_OFF_SHARE_ON} />,
		title: "Privacy: memory off, sharing on (23)",
	},
	{
		id: "privacy-6-months-alert",
		options: OPTIONS,
		Screen: () => <FixturePrivacy state={PRIVACY_6_MONTHS_ALERT} />,
		title: "Privacy: 6 months, 17 would go (24)",
	},
	{
		id: "privacy-1-year-alert",
		options: OPTIONS,
		Screen: () => <FixturePrivacy state={PRIVACY_1_YEAR_ALERT} />,
		title: "Privacy: a year, 8 would go",
	},
	{
		id: "privacy-alert-capped",
		options: OPTIONS,
		Screen: () => <FixturePrivacy state={PRIVACY_ALERT_CAPPED} />,
		title: "Privacy: more than 100 would go",
	},
	{
		id: "privacy-6-months-kept",
		options: OPTIONS,
		Screen: () => <FixturePrivacy state={PRIVACY_6_MONTHS} />,
		title: "Privacy: after Delete them, 6 months (25)",
	},
	{
		id: "privacy-scrolled-6-months",
		options: OPTIONS,
		Screen: () => <FixturePrivacy scrolledToEnd state={PRIVACY_6_MONTHS} />,
		title: "Privacy: scrolled to Delete, 6 months (26)",
	},
	{
		id: "privacy-deleted",
		options: OPTIONS,
		Screen: () => <FixturePrivacy state={PRIVACY_TOP} />,
		title:
			"Privacy: after deleting all data (28; no count, toast from the hook)",
	},
	{
		id: "privacy-policy",
		options: OPTIONS,
		Screen: () => <FixturePrivacy state={PRIVACY_POLICY_OPEN} />,
		title: "Privacy: the privacy policy sheet",
	},
	{
		id: "privacy-loading",
		options: OPTIONS,
		Screen: () => <FixturePrivacy state={PRIVACY_LOADING} />,
		title: "Privacy while preferences load",
	},
	{
		id: "delete-data",
		options: DATA_SHEET,
		Screen: () => <FixtureDeleteSheet state={DELETE_DATA} />,
		title: "Delete all my data sheet (27)",
	},
	{
		id: "delete-data-busy",
		options: DATA_SHEET,
		Screen: () => <FixtureDeleteSheet state={DELETE_DATA_BUSY} />,
		title: "Delete all my data: Deleting…",
	},
	{
		id: "delete-account",
		options: ACCOUNT_SHEET,
		Screen: () => <FixtureDeleteSheet state={DELETE_ACCOUNT} />,
		title: "Delete account sheet, free",
	},
	{
		id: "delete-account-plus",
		options: ACCOUNT_SHEET,
		Screen: () => <FixtureDeleteSheet state={DELETE_ACCOUNT_PLUS} />,
		title: "Delete account sheet on Xolace+ (29)",
	},
];
