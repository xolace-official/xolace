import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { hasAdminRole, NO_ACCESS_PATH } from "./access";

/*
 * Page guards for the route-group layouts. They only decide what to show:
 * every admin function checks the role again in Convex.
 */

/** Console pages: signed out → /sign-in, signed in without the role → /no-access. */
export async function requireAdmin() {
	const { isAuthenticated, sessionClaims, redirectToSignIn } = await auth();
	if (!isAuthenticated) {
		return redirectToSignIn();
	}
	if (!hasAdminRole(sessionClaims)) {
		redirect(NO_ACCESS_PATH);
	}
}

/** /sign-in: someone already signed in goes where their role allows. */
export async function redirectIfSignedIn() {
	const { isAuthenticated, sessionClaims } = await auth();
	if (isAuthenticated) {
		redirect(hasAdminRole(sessionClaims) ? "/" : NO_ACCESS_PATH);
	}
}

/** /no-access: signed out → /sign-in; an admin has nothing to see here. */
export async function requireNonAdmin() {
	const { isAuthenticated, sessionClaims, redirectToSignIn } = await auth();
	if (!isAuthenticated) {
		return redirectToSignIn();
	}
	if (hasAdminRole(sessionClaims)) {
		redirect("/");
	}
}
