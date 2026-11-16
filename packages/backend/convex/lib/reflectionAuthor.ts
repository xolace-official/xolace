import type { Doc, Id } from "../_generated/dataModel";

// =============================================================
// Peer-reflection author tags (ADR 0002). Server-only: never add this
// module to the client-safe allowlist, and never return a tag.
//
// A reflection carries an HMAC of its contributor's profile id under the
// per-deployment REFLECTION_AUTHOR_KEY, so matching can leave a viewer's
// own reflections out without the pool storing who wrote them.
//
// NEVER ROTATE THE KEY: a new key orphans every existing tag, and every
// contributor starts seeing their own reflections again.
//
// A missing key fails open: contribution pools untagged and matching
// skips the exclusion, each with an error logged.
// =============================================================

const KEY_ENV = "REFLECTION_AUTHOR_KEY";

type Reflection = Doc<"reflections">;

/** The reflection as a client or admin may see it: never with its tag. */
export type ClientReflection = Omit<Reflection, "authorTag">;

function authorKey(): string | null {
	return process.env[KEY_ENV] || null;
}

async function hmacHex(key: string, message: string): Promise<string> {
	const encoder = new TextEncoder();
	const cryptoKey = await crypto.subtle.importKey(
		"raw",
		encoder.encode(key),
		{ hash: "SHA-256", name: "HMAC" },
		false,
		["sign"]
	);
	const signature = await crypto.subtle.sign(
		"HMAC",
		cryptoKey,
		encoder.encode(message)
	);
	return Array.from(new Uint8Array(signature), (b) =>
		b.toString(16).padStart(2, "0")
	).join("");
}

/** True for a reflection someone other than the viewer contributed. */
export type NotOwn = (r: Reflection) => boolean;

/**
 * The author tag for a contributor, or null when the key is missing. Silent:
 * the caller decides what failing open means and logs it.
 */
export async function authorTagFor(
	profileId: Id<"emotional_profiles">
): Promise<string | null> {
	const key = authorKey();
	return key ? await hmacHex(key, profileId) : null;
}

/**
 * A predicate keeping only reflections the viewer did not contribute.
 * With no key it keeps everything and logs an error (fail open).
 */
export async function notContributedBy(
	profileId: Id<"emotional_profiles">
): Promise<NotOwn> {
	const tag = await authorTagFor(profileId);
	if (!tag) {
		console.error(
			`${KEY_ENV} is not set: peer reflections are not excluding the viewer's own`
		);
		return () => true;
	}
	return (r) => r.authorTag !== tag;
}

/** Strip the author tag before a reflection leaves the server. */
export function toClientReflection(r: Reflection): ClientReflection {
	const { authorTag: _authorTag, ...rest } = r;
	return rest;
}
