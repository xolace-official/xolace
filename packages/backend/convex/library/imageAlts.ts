import { ConvexError } from "convex/values";

// `![alt](src ...)` or `![alt][ref]`: the alt, then the src or the ref label.
const MD_IMAGE = /!\[([^\]]*)\](?:\(\s*<?([^)\s>]+)|\[([^\]]*)\])/g;

/**
 * Alt text is a hard ingest gate (#400): every image in the body needs alt
 * text, unless the manifest lists its src (or reference label) in
 * `decorativeImages` — then its empty alt is deliberate, and the renderer
 * keeps it silent.
 */
export function assertImageAlts(slug: string, markdown: string, decorative: readonly string[] = []) {
  for (const [, alt, src, ref] of markdown.matchAll(MD_IMAGE)) {
    const target = src ?? ref;
    if (alt.trim() || decorative.includes(target)) continue;
    throw new ConvexError(
      `library entry "${slug}": image "${target}" has no alt text — write one, or list it in decorativeImages`,
    );
  }
}
