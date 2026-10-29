import { api } from "@xolace/backend/api";
import { ConvexHttpClient } from "convex/browser";
import type { FunctionReturnType } from "convex/server";
import { ConvexError } from "convex/values";

export type Me = FunctionReturnType<typeof api.users.getMe>;

/** The `code` a backend ConvexError carries (`user_not_found`, ...), if any. */
export const convexErrorCode = (error: unknown) => {
	if (!(error instanceof ConvexError)) {
		return;
	}
	const { data } = error;
	if (typeof data === "object" && data !== null && "code" in data) {
		return typeof data.code === "string" ? data.code : undefined;
	}
};

/** What to tell someone whose Clerk sign-in works but who has no Xolace account. */
export const NO_ACCOUNT_MESSAGE =
	"There's no Xolace account for this sign-in yet. Finish signing up in the Xolace app, then run `xolace whoami`.";

export const fetchMe = (convexUrl: string, idToken: string): Promise<Me> => {
	const client = new ConvexHttpClient(convexUrl);
	client.setAuth(idToken);
	return client.query(api.users.getMe, {});
};

export const describeMe = (me: Me) =>
	`Signed in as ${me.displayName ?? "(no display name yet)"}${me.isXolacer ? " · Xolacer" : ""}`;
