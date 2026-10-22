"use node";

import { v } from "convex/values";
import { gunzipSync } from "node:zlib";
import { internalAction } from "./_generated/server";

/**
 * A gzip bomb is a few kilobytes on the wire and gigabytes once expanded, and
 * this runs before the signature check — anyone who finds the URL can post one.
 * Stream's message events are a few KB, so this cap is orders of magnitude of
 * headroom for a real payload and a hard stop for a crafted one. Over it,
 * `gunzipSync` throws `ERR_BUFFER_TOO_LARGE`, which the caller drops.
 */
export const MAX_UNCOMPRESSED_BYTES = 2 * 1024 * 1024;

export function decompressWebhookBody(body: ArrayBuffer): string {
  return gunzipSync(Buffer.from(body), {
    maxOutputLength: MAX_UNCOMPRESSED_BYTES,
  }).toString("utf8");
}

/**
 * Stream's prod webhook client gzips its payload, and Convex hands HTTP actions
 * the body exactly as it arrived — no transparent decoding. The default runtime
 * has no `DecompressionStream`, so the one gunzip in this codebase lives here,
 * in Node, and is called only when `content-encoding: gzip` is actually set.
 */
export const gunzip = internalAction({
  args: { body: v.bytes() },
  returns: v.string(),
  handler: async (_ctx, args) => decompressWebhookBody(args.body),
});
