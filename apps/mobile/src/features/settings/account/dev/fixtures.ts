import type { Account } from "@/features/settings/account/account-data";
import { nameError } from "@/features/settings/account/account-model";

const ignore = () => undefined;

export const ACCOUNT_ACTIONS: Account["actions"] = {
	askLogOut: ignore,
	cancelEdit: ignore,
	closeLogOut: ignore,
	edit: ignore,
	logOut: ignore,
	manageSubscription: ignore,
	openPrivacy: ignore,
	resetSpace: ignore,
	restore: ignore,
	save: ignore,
	setDraft: ignore,
};

export const ACCOUNT_PLUS: Account["state"] = {
	companion: "Ember",
	dialog: null,
	logOutOpen: false,
	name: "Wren",
	plus: true,
	restoring: false,
	signIn: "apple",
	space: null,
};

export const ACCOUNT_NAME_DIALOG: Account["state"] = {
	...ACCOUNT_PLUS,
	dialog: { draft: "Wren", error: "", kind: "name" },
};

const MAYA = "Dr-Maya";

export const ACCOUNT_SPACE_ERROR: Account["state"] = {
	...ACCOUNT_PLUS,
	dialog: { draft: MAYA, error: nameError("space", MAYA), kind: "space" },
};

export const ACCOUNT_LOGOUT_ALERT: Account["state"] = {
	...ACCOUNT_PLUS,
	logOutOpen: true,
};

export const ACCOUNT_FREE_GOOGLE: Account["state"] = {
	...ACCOUNT_PLUS,
	plus: false,
	signIn: "google",
};

export const ACCOUNT_RESTORING: Account["state"] = {
	...ACCOUNT_PLUS,
	plus: false,
	restoring: true,
	signIn: "email",
	space: "Haven",
};

export const ACCOUNT_LOADING: Account["state"] = {
	...ACCOUNT_PLUS,
	name: undefined,
	plus: undefined,
	signIn: undefined,
	space: undefined,
};
