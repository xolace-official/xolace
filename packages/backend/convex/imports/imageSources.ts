import { v } from "convex/values";
import { internalMutation, type MutationCtx } from "../_generated/server";
import { assertSha256 } from "../admin/uploads";
import type { CompareScope } from "./plan";
import type { DropRecord } from "./records";

/**
 * The browser encodes WebP with jSquash and the ingest scripts with sharp: the
 * same source makes different bytes, so a different R2 key. Compare notes which
 * source each processed WebP came from, and treats a dropped image as unchanged
 * when it's the source of the stored one.
 *
 * Keyed by the WebP's hash (the one in its R2 key), so it holds only for the
 * key a row points at now: a cover replaced in an editor, or by a script run,
 * has another hash and no longer matches.
 */

/** `thumb/<sha256>.webp`, `library-thumb/…`, `hub-cover/…` */
const WEBP_KEY = /\/([0-9a-f]{64})\.webp$/;

const findPair = (
	db: MutationCtx["db"],
	webpSha256: string,
	sourceSha256: string
) =>
	db
		.query("image_sources")
		.withIndex("by_webpSha256_and_sourceSha256", (q) =>
			q.eq("webpSha256", webpSha256).eq("sourceSha256", sourceSha256)
		)
		.first();

async function notePair(
	db: MutationCtx["db"],
	webpSha256: string,
	sourceSha256: string
) {
	assertSha256(webpSha256);
	assertSha256(sourceSha256);
	if (!(await findPair(db, webpSha256, sourceSha256))) {
		await db.insert("image_sources", { sourceSha256, webpSha256 });
	}
}

/**
 * `d`, without its image when that image is the source of `storedKey`: the
 * record then keeps the stored cover, as if the drop had left the file out.
 * Notes the dropped image's WebPs either way.
 */
export async function unlessSameSource(
	scope: CompareScope,
	d: DropRecord,
	storedKey: string | undefined
): Promise<DropRecord> {
	const source = d.image?.sourceSha256;
	if (!(d.image && source)) {
		return d;
	}
	assertSha256(source);
	const { db } = scope.ctx;
	const storedSha = storedKey ? WEBP_KEY.exec(storedKey)?.[1] : undefined;
	const dropped = d.image.webp.map((w) => w.sha256);
	if (
		storedSha &&
		!dropped.includes(storedSha) &&
		(await findPair(db, storedSha, source))
	) {
		return { ...d, image: undefined };
	}
	for (const webpSha256 of dropped) {
		await notePair(db, webpSha256, source);
	}
	return d;
}

/**
 * The ingest scripts note their sharp WebPs, so an import of the same source
 * keeps a cover a script uploaded. A `--thumbs-only` (Kindling) or full library
 * run notes the images already stored.
 */
export const note = internalMutation({
	args: {
		pairs: v.array(
			v.object({ sourceSha256: v.string(), webpSha256: v.string() })
		),
	},
	handler: async (ctx, { pairs }) => {
		for (const { sourceSha256, webpSha256 } of pairs) {
			await notePair(ctx.db, webpSha256, sourceSha256);
		}
		return null;
	},
	returns: v.null(),
});
