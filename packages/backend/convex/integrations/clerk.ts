/**
 * Clerk Backend API — plain fetch, so it runs in Convex's default runtime (no
 * "use node", no Clerk server SDK). Needs CLERK_SECRET_KEY in the deployment env.
 */

const BASE_URL = "https://api.clerk.com/v1";

/**
 * True once the Clerk user is gone: deleted now, or already (404). A failure
 * rather than a throw, because the caller's retry is what keeps the promise.
 * Logs the status only: the id is identity data.
 */
export async function deleteClerkUser(clerkUserId: string): Promise<boolean> {
	const secret = process.env.CLERK_SECRET_KEY;
	if (!secret) {
		console.error("[clerk] delete user: CLERK_SECRET_KEY not set");
		return false;
	}
	try {
		const res = await fetch(
			`${BASE_URL}/users/${encodeURIComponent(clerkUserId)}`,
			{ headers: { Authorization: `Bearer ${secret}` }, method: "DELETE" }
		);
		if (res.ok || res.status === 404) {
			return true;
		}
		console.error("[clerk] delete user failed", res.status);
	} catch (err) {
		console.error("[clerk] delete user request failed", err);
	}
	return false;
}
