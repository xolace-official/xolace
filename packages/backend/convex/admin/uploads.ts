import { ConvexError, v } from "convex/values";
import { r2 } from "../ai/paths/audioTracks";
import { adminMutation } from "../lib/adminAuth";
import schema from "../schema";
import { assertSlug } from "./edits";

/**
 * Signed R2 upload URLs for the admin's media (admin v1 step 6b). The browser
 * processes images itself (Lanczos3 resize, WebP q78 effort 6 and a
 * ThumbHash, the ingest scripts' settings) and PUTs the bytes; attaching an
 * upload to a row is a mutation in that row's module.
 *
 * The server picks every key, so a client can't write over another object or
 * outside these prefixes. Not `r2.clientApi`: its keys are random, while the
 * scripts and readers share content-addressed image keys
 * (`thumb/<sha256>.webp`), and it exports public read and delete functions.
 */

const SHA256 = /^[0-9a-f]{64}$/;

export function assertSha256(sha256: string) {
	if (!SHA256.test(sha256)) {
		throw new ConvexError(`"${sha256}" is not a hex SHA-256`);
	}
}

// Base64 of a ThumbHash: at most 25 bytes, so 36 characters.
const THUMBHASH = /^[A-Za-z0-9+/]{1,40}={0,2}$/;

export function assertThumbhash(thumbhash: string) {
	if (!THUMBHASH.test(thumbhash)) {
		throw new ConvexError("not a base64 ThumbHash");
	}
}

/** Track thumbnails and topic covers share `thumb/`, as in the Kindling ingest; hubs use `hub-cover/`. */
const IMAGE_PREFIX = { hubCover: "hub-cover", thumb: "thumb" } as const;

export type ImageUse = keyof typeof IMAGE_PREFIX;

export function imageKey(use: ImageUse, sha256: string) {
	assertSha256(sha256);
	return `${IMAGE_PREFIX[use]}/${sha256}.webp`;
}

const imageUse = v.union(v.literal("hubCover"), v.literal("thumb"));

/** What New track accepts: "MP3, M4A or WAV". */
const audioExt = v.union(v.literal("mp3"), v.literal("m4a"), v.literal("wav"));

const { family: familyValidator } = schema.tables.audio_tracks.validator.fields;

/** Audio keys are unique per upload, like the script's: `<family>/<slug>/<uuid>.<ext>`. */
export const audioKeyPrefix = (family: string, slug: string) =>
	`${family}/${slug}/`;

const uploadUrl = v.object({ key: v.string(), url: v.string() });

/**
 * Signed preview links (players, thumbnails, covers). Convex can serve a
 * cached query result for as long as its reads are unchanged, so a link may
 * reach the client long after it was signed. The client passes the current
 * `linkWindow` (`floor(Date.now() / 30 min)`) and moves to the next one on
 * time: each window is a new query, and a link signed in it stays valid two
 * hours, well past the window's end.
 */
export const linkWindow = v.number();
export const PREVIEW_URL_TTL_SEC = 2 * 60 * 60;

/** Upload URL for a processed WebP, keyed by its hash. Re-uploading the same image overwrites identical bytes. */
export const imageUploadUrl = adminMutation({
	args: { sha256: v.string(), use: imageUse },
	handler: (_ctx, { sha256, use }) =>
		r2.generateUploadUrl(imageKey(use, sha256)),
	returns: uploadUrl,
});

/** Upload URL for a track's audio file, under a fresh key. */
export const audioUploadUrl = adminMutation({
	args: { ext: audioExt, family: familyValidator, slug: v.string() },
	handler: (_ctx, { ext, family, slug }) => {
		assertSlug(slug);
		return r2.generateUploadUrl(
			`${audioKeyPrefix(family, slug)}${crypto.randomUUID()}.${ext}`
		);
	},
	returns: uploadUrl,
});

/** Exactly what `audioUploadUrl` mints, so nothing else can be named for deletion. */
const UPLOADED_AUDIO_KEY =
	/^(?:support|music)\/([a-z0-9]+(?:-[a-z0-9]+)*)\/[0-9a-f-]{36}\.(?:mp3|m4a|wav)$/;

/**
 * Drop an audio upload whose save was rejected (a gate failed, a slug was
 * taken), so retries don't pile up files in R2. The key names its track, and
 * the key a track points at is never deleted.
 */
export const discardAudio = adminMutation({
	args: { key: v.string() },
	handler: async (ctx, { key }) => {
		const slug = UPLOADED_AUDIO_KEY.exec(key)?.[1];
		if (!slug) {
			throw new ConvexError(`"${key}" isn't an admin audio upload`);
		}
		const track = await ctx.db
			.query("audio_tracks")
			.withIndex("by_slug", (q) => q.eq("slug", slug))
			.unique();
		if (track?.key !== key) {
			await r2.deleteObject(ctx, key);
		}
		return null;
	},
	returns: v.null(),
});
