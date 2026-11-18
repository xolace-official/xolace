/** Settings › Account on fixtures: the board's account (Apple, Wren, Ember, Xolace+). */
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

/** Render 30: Apple, on Xolace+, the space unnamed. */
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

/** Your name open on "Wren". */
export const ACCOUNT_NAME_DIALOG: Account["state"] = {
	...ACCOUNT_PLUS,
	dialog: { draft: "Wren", error: "", kind: "name" },
};

const MAYA = "Dr-Maya";

/** Render 31: Your space with "Dr-Maya", which the denylist refuses. */
export const ACCOUNT_SPACE_ERROR: Account["state"] = {
	...ACCOUNT_PLUS,
	dialog: { draft: MAYA, error: nameError("space", MAYA), kind: "space" },
};

/** Render 32: the log-out alert. */
export const ACCOUNT_LOGOUT_ALERT: Account["state"] = {
	...ACCOUNT_PLUS,
	logOutOpen: true,
};

/** Render 33: free, signed in with Google (drawn dark by its state). */
export const ACCOUNT_FREE_GOOGLE: Account["state"] = {
	...ACCOUNT_PLUS,
	plus: false,
	signIn: "google",
};

/** Free, no provider Clerk knows (email), a restore running, a space of its own. */
export const ACCOUNT_RESTORING: Account["state"] = {
	...ACCOUNT_PLUS,
	plus: false,
	restoring: true,
	signIn: "email",
	space: "Haven",
};

/** Clerk, preferences, the profile and the entitlement still loading. */
export const ACCOUNT_LOADING: Account["state"] = {
	...ACCOUNT_PLUS,
	name: undefined,
	plus: undefined,
	signIn: undefined,
	space: undefined,
};
