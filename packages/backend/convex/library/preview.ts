import { v } from "convex/values";
import { internal } from "../_generated/api";
import { httpAction, internalQuery } from "../_generated/server";
import { r2 } from "../ai/paths/audioTracks";
import schema from "../schema";

/**
 * Public Lantern preview: what xolaceinc.com shows for a shared link
 * (`/lantern/<slug>`) to someone without the app. Cover, title, dek and story
 * descriptor of an entry that is live to readers, never its body, audio or a
 * curator-only field. Unauthenticated by design: slugs are public in every
 * share. The returns validator is the allow-list.
 */

export const PREVIEW_PATH = "/lantern/preview";

/** Slugs are kebab-case; anything else can't be one, so it never reaches the db. */
const SLUG = /^[a-z0-9-]{1,128}$/;

/**
 * The website renders the page server-side and caches it, and link-preview
 * crawlers keep the image they fetched, so the cover stays signed far longer
 * than the app's hour. 7 days is R2's presign maximum.
 */
const PREVIEW_COVER_TTL_SEC = 7 * 24 * 60 * 60;

const CACHE_CONTROL = "public, max-age=300, s-maxage=3600";

const { kind: kindValidator } = schema.tables.library_entries.validator.fields;

const previewValidator = v.object({
	coverUrl: v.optional(v.string()),
	dek: v.string(),
	kind: kindValidator,
	readMin: v.number(),
	slug: v.string(),
	storyDescriptor: v.optional(v.string()),
	title: v.string(),
});

/** One live entry's preview fields, or null for an unknown, draft or retired slug. */
export const getPreview = internalQuery({
	args: { slug: v.string() },
	handler: async (ctx, { slug }) => {
		const e = await ctx.db
			.query("library_entries")
			.withIndex("by_slug", (q) => q.eq("slug", slug))
			.unique();
		// Same gate as every reader list: drafts and retired entries are inactive.
		if (!e?.active) {
			return null;
		}
		// The 1280 WebP, then the uploaded original, then a plain hosted URL (as `coverOf`).
		const key = e.cover1280Key ?? e.coverKey;
		const coverUrl = key
			? await r2.getUrl(key, { expiresIn: PREVIEW_COVER_TTL_SEC })
			: e.coverUrl;
		return {
			coverUrl,
			dek: e.dek,
			kind: e.kind,
			readMin: e.readMin,
			slug: e.slug,
			storyDescriptor: e.storyDescriptor,
			title: e.title,
		};
	},
	returns: v.union(v.null(), previewValidator),
});

const json = (body: unknown, status: number, cache: boolean) =>
	new Response(JSON.stringify(body), {
		headers: {
			"Content-Type": "application/json",
			...(cache ? { "Cache-Control": CACHE_CONTROL } : {}),
		},
		status,
	});

/** `GET /lantern/preview?slug=<slug>`: 200 preview, 404 `not_found`, 400 `invalid_slug`. */
export const lanternPreview = httpAction(async (ctx, request) => {
	const slug = new URL(request.url).searchParams.get("slug");
	if (!(slug && SLUG.test(slug))) {
		return json({ error: "invalid_slug" }, 400, false);
	}
	const preview = await ctx.runQuery(internal.library.preview.getPreview, {
		slug,
	});
	if (!preview) {
		// Cached too, so a retired entry drops off the site within the hour.
		return json({ error: "not_found" }, 404, true);
	}
	return json(preview, 200, true);
});
