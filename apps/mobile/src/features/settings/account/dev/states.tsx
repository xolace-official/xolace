import { themeVariant } from "@/design/themes";
import type { DevState } from "@/dev/dev-state";
import { FixtureAccount } from "@/features/settings/account/dev/fixture-account";
import {
	ACCOUNT_FREE_GOOGLE,
	ACCOUNT_LOADING,
	ACCOUNT_LOGOUT_ALERT,
	ACCOUNT_NAME_DIALOG,
	ACCOUNT_PLUS,
	ACCOUNT_RESTORING,
	ACCOUNT_SPACE_ERROR,
} from "@/features/settings/account/dev/fixtures";

const OPTIONS = { title: "Account" };
const DARK = themeVariant("default", "dark");

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "account-plus",
		options: OPTIONS,
		Screen: () => <FixtureAccount state={ACCOUNT_PLUS} />,
		title: "Account on Xolace+, Apple (render 30)",
	},
	{
		id: "account-name-dialog",
		options: OPTIONS,
		Screen: () => <FixtureAccount state={ACCOUNT_NAME_DIALOG} />,
		title: "Account, Your name dialog",
	},
	{
		id: "account-space-error",
		options: OPTIONS,
		Screen: () => <FixtureAccount state={ACCOUNT_SPACE_ERROR} />,
		title: "Account, Your space with Dr-Maya (render 31)",
	},
	{
		id: "account-logout-alert",
		options: OPTIONS,
		Screen: () => <FixtureAccount state={ACCOUNT_LOGOUT_ALERT} />,
		title: "Account, the Log out alert (render 32)",
	},
	{
		id: "account-free-google-dark",
		options: OPTIONS,
		Screen: () => <FixtureAccount state={ACCOUNT_FREE_GOOGLE} theme={DARK} />,
		title: "Account, free, Google, dark (render 33)",
	},
	{
		id: "account-restoring",
		options: OPTIONS,
		Screen: () => <FixtureAccount state={ACCOUNT_RESTORING} />,
		title: "Account, email, free, restoring",
	},
	{
		id: "account-loading",
		options: OPTIONS,
		Screen: () => <FixtureAccount state={ACCOUNT_LOADING} />,
		title: "Account while Clerk, the names and Xolace+ load",
	},
];
