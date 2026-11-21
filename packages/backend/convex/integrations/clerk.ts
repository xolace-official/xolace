/**
 * Clerk Backend API — plain fetch, so it runs in Convex's default runtime (no
 * "use node", no Clerk server SDK). Needs CLERK_SECRET_KEY in the deployment env.
 */

const BASE_URL = "https://api.clerk.com/v1";

/** A request still out after this is abandoned; the caller's claim outlasts it. */
export const CLERK_TIMEOUT_MS = 10 * 1000;

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
			{
				headers: { Authorization: `Bearer ${secret}` },
				method: "DELETE",
				signal: AbortSignal.timeout(CLERK_TIMEOUT_MS),
			}
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

const NOT_FOUND = 404;

/**
 * A user's primary email address, as Clerk has it now:
 * - `found`: the primary address, and it is verified;
 * - `missing`: no such Clerk user (404), or no verified primary address;
 * - `failed`: anything else, with the HTTP status when there was a response.
 */
export type PrimaryEmail =
	| { address: string; kind: "found" }
	| { kind: "missing" }
	| { kind: "failed"; status?: number };

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

/** The verified primary address in a Clerk user object, if it has one. */
function verifiedPrimary(user: unknown): string | null {
	if (!(isRecord(user) && Array.isArray(user.email_addresses))) {
		return null;
	}
	for (const entry of user.email_addresses) {
		if (
			isRecord(entry) &&
			entry.id === user.primary_email_address_id &&
			typeof entry.email_address === "string" &&
			isRecord(entry.verification) &&
			entry.verification.status === "verified"
		) {
			return entry.email_address;
		}
	}
	return null;
}

/**
 * Look up the user's primary verified email at send time (ADR 0004): it is
 * never stored on a Xolace record. Logs the status only: the address and the
 * id are identity data.
 */
export async function primaryEmailOf(
	clerkUserId: string
): Promise<PrimaryEmail> {
	const secret = process.env.CLERK_SECRET_KEY;
	if (!secret) {
		console.error("[clerk] user email: CLERK_SECRET_KEY not set");
		return { kind: "failed" };
	}
	let res: Response;
	try {
		res = await fetch(`${BASE_URL}/users/${encodeURIComponent(clerkUserId)}`, {
			headers: { Authorization: `Bearer ${secret}` },
			signal: AbortSignal.timeout(CLERK_TIMEOUT_MS),
		});
	} catch (err) {
		console.error("[clerk] user email request failed", err);
		return { kind: "failed" };
	}
	if (res.status === NOT_FOUND) {
		return { kind: "missing" };
	}
	if (!res.ok) {
		console.error("[clerk] user email failed", res.status);
		return { kind: "failed", status: res.status };
	}
	const address = verifiedPrimary(await res.json());
	return address === null ? { kind: "missing" } : { address, kind: "found" };
}
