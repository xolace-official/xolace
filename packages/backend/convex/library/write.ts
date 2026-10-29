import { ConvexError, type Infer } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
	canonicalFacet,
	PRIMARY_EMOTIONS,
	THEMATIC_TAGS,
} from "../lib/understandingVocab";
import { assertImageAlts } from "./imageAlts";
import { assertPublishable } from "./publishGates";
import { searchTextOf } from "./searchText";
import {
	assertSourcesFit,
	type manifestSource,
	replaceSources,
	resolveSourceSlugs,
} from "./sources";

/**
 * The one write path for library rows, shared by the curator ingest
 * (`library/ingest.ts`) and the admin (`admin/library.ts`, `admin/hubs.ts`),
 * so the two can't enforce different rules.
 */

type ManifestSource = Infer<typeof manifestSource>;

/** What a caller sets on an entry; everything else is derived here. */
export type EntryFields = Omit<
	Doc<"library_entries">,
	| "_id"
	| "_creationTime"
	| "editedBy"
	| "readMin"
	| "retiredAt"
	| "safetyReviewedAt"
	| "searchText"
	| "sha256"
	| "updatedAt"
>;

const FACET_VOCAB: Record<string, ReadonlySet<string>> = {
	emotion: new Set(PRIMARY_EMOTIONS),
	lifeArea: new Set(THEMATIC_TAGS),
};

const WORDS_PER_MIN = 200;

export const readMinOf = (markdown: string) =>
	Math.max(
		1,
		Math.ceil(markdown.split(/\s+/).filter(Boolean).length / WORDS_PER_MIN)
	);

/**
 * `retiredAt` after a write that sets `active`: cleared while live, stamped
 * when a live row goes down, otherwise kept (a draft stays a draft).
 */
export function retiredAtAfter(
	existing: { active: boolean; retiredAt?: number } | null,
	active: boolean,
	now: number
) {
	if (active) {
		return;
	}
	return existing?.active ? now : existing?.retiredAt;
}

/** Facet pairs, canonical and checked against the Understanding vocabulary, plus the primary subject. */
export function facetPairs(
	slug: string,
	primarySubject: string,
	facets: Record<string, string[]>
) {
	const pairs = new Map<string, { axis: string; slug: string }>();
	for (const [axis, slugs] of [
		...Object.entries(facets),
		["subject", [primarySubject]] as const,
	]) {
		for (const authored of slugs) {
			const facet = canonicalFacet(axis, authored);
			if (FACET_VOCAB[axis] && !FACET_VOCAB[axis].has(facet)) {
				throw new ConvexError(
					`library entry "${slug}": ${axis} "${facet}" is not in the Understanding vocabulary`
				);
			}
			pairs.set(`${axis}\u0000${facet}`, { axis, slug: facet });
		}
	}
	return [...pairs.values()];
}

/** A review covers one body: any edit clears it (#392). */
export const reviewAfterWrite = (
	existing: Pick<Doc<"library_entries">, "safetyReviewedAt"> | null,
	storedBody: string | undefined,
	markdown: string
) => (storedBody === markdown ? existing?.safetyReviewedAt : undefined);

/**
 * Everything a live entry needs, checked by the admin on Publish and on any
 * save of a live entry: copy, credits that fit `reuse`, alt text, and the
 * consent and safety gates.
 */
export function assertEntryLive(
	e: Pick<
		Doc<"library_entries">,
		| "slug"
		| "kind"
		| "reuse"
		| "title"
		| "dek"
		| "consentRecordedAt"
		| "safetyReviewedAt"
	>,
	markdown: string,
	sources: Pick<Doc<"library_sources">, "name">[]
) {
	if (!(e.title.trim() && e.dek.trim())) {
		throw new ConvexError(`library entry "${e.slug}": needs a title and dek`);
	}
	if (!markdown.trim()) {
		throw new ConvexError(`library entry "${e.slug}": needs a body`);
	}
	// Originals too: they credit Xolace, as the editor's checklist asks.
	if (sources.length === 0) {
		throw new ConvexError(`library entry "${e.slug}": needs at least 1 source`);
	}
	assertSourcesFit(e, sources);
	assertImageAlts(e.slug, markdown);
	assertPublishable({ ...e, active: true });
}

/**
 * Inserts or replaces an entry with its body, facets and credits, then
 * re-embeds it off the transaction.
 *
 * `strict` is the ingest contract: every gate applies to drafts too (a story
 * needs consent to exist at all, credits must fit `reuse`). The admin passes
 * `strict: false`, so a draft can be saved half-done and the gates apply only
 * once it is live. Either way an edited body drops the safety review (#392).
 */
export async function writeEntry(
	ctx: MutationCtx,
	existing: Doc<"library_entries"> | null,
	write: {
		facets: Record<string, string[]>;
		fields: EntryFields;
		markdown: string;
		sources: ManifestSource[];
	},
	opts: { editedBy?: string; sha256?: string; strict: boolean }
): Promise<Id<"library_entries">> {
	const { facets, fields, markdown, sources } = write;
	const resolved = await resolveSourceSlugs(ctx, fields, sources);
	const pairs = facetPairs(fields.slug, fields.primarySubject, facets);

	const body = existing
		? await ctx.db
				.query("library_entry_bodies")
				.withIndex("by_entryId", (q) => q.eq("entryId", existing._id))
				.unique()
		: null;
	const now = Date.now();
	const doc = {
		...fields,
		editedBy: opts.editedBy,
		readMin: readMinOf(markdown),
		retiredAt: retiredAtAfter(existing, fields.active, now),
		safetyReviewedAt: reviewAfterWrite(existing, body?.markdown, markdown),
		searchText: searchTextOf(fields, pairs),
		sha256: opts.sha256,
		updatedAt: now,
	};
	if (opts.strict) {
		assertSourcesFit(doc, resolved);
		assertPublishable(doc);
	} else if (doc.active) {
		assertEntryLive(doc, markdown, resolved);
	}

	let entryId = existing?._id;
	if (entryId) {
		await ctx.db.replace("library_entries", entryId, doc);
		const old = await ctx.db
			.query("library_entry_facets")
			.withIndex("by_entryId", (q) => q.eq("entryId", entryId!))
			.take(500);
		await Promise.all(
			old.map((f) => ctx.db.delete("library_entry_facets", f._id))
		);
	} else {
		entryId = await ctx.db.insert("library_entries", doc);
	}
	if (body) {
		await ctx.db.patch("library_entry_bodies", body._id, { markdown });
	} else {
		await ctx.db.insert("library_entry_bodies", { entryId, markdown });
	}
	for (const f of pairs) {
		await ctx.db.insert("library_entry_facets", { entryId, ...f });
	}
	await replaceSources(ctx, entryId, sources, resolved);
	// Re-embed (or drop, if inactive) off the transaction: embedding is network.
	await ctx.scheduler.runAfter(0, internal.ai.library.embed.indexEntry, {
		entryId,
	});
	return entryId;
}

/** A hub item as files and the admin name it: an entry or track slug. */
export interface HubItemRef {
	kind: "entry" | "audio";
	ref: string;
}

/** Resolves hub item slugs to ids, in order; an unknown slug is an error. */
export async function resolveHubItems(
	ctx: MutationCtx,
	hubSlug: string,
	refs: HubItemRef[]
) {
	const items: Doc<"library_hubs">["items"] = [];
	for (const { kind, ref } of refs) {
		const missing = () =>
			new ConvexError(`library hub "${hubSlug}": unknown ${kind} "${ref}"`);
		if (kind === "entry") {
			const e = await ctx.db
				.query("library_entries")
				.withIndex("by_slug", (q) => q.eq("slug", ref))
				.unique();
			if (!e) {
				throw missing();
			}
			items.push({ entryId: e._id, kind });
		} else {
			const t = await ctx.db
				.query("audio_tracks")
				.withIndex("by_slug", (q) => q.eq("slug", ref))
				.unique();
			if (!t) {
				throw missing();
			}
			items.push({ audioTrackId: t._id, kind });
		}
	}
	return items;
}

/** What a live hub needs. Items that aren't live are allowed: readers skip them. */
export function assertHubLive(
	h: Pick<Doc<"library_hubs">, "slug" | "title" | "intro"> & {
		items: readonly unknown[];
	}
) {
	if (!(h.title.trim() && h.intro.trim())) {
		throw new ConvexError(`library hub "${h.slug}": needs a title and intro`);
	}
	if (h.items.length === 0) {
		throw new ConvexError(`library hub "${h.slug}": needs at least one item`);
	}
}

/** A source as files name it: the row minus what writes derive. */
export type SourceFields = Omit<
	Doc<"library_sources">,
	"_id" | "_creationTime" | "editedBy" | "sha256" | "updatedAt"
>;

/**
 * Inserts or replaces a source from a file (ingest, imports). Replacing drops
 * `editedBy`: the file is now the latest word.
 */
export async function upsertSourceRecord(
	ctx: MutationCtx,
	source: SourceFields,
	sha256?: string
) {
	const existing = await ctx.db
		.query("library_sources")
		.withIndex("by_slug", (q) => q.eq("slug", source.slug))
		.unique();
	const doc = { ...source, sha256, updatedAt: Date.now() };
	if (!existing) {
		await ctx.db.insert("library_sources", doc);
		return "inserted" as const;
	}
	await ctx.db.replace("library_sources", existing._id, doc);
	return "updated" as const;
}

/** A hub as files name it: items by slug, covers already uploaded. */
export type HubRecord = Pick<
	Doc<"library_hubs">,
	| "active"
	| "cover1280Key"
	| "coverKey"
	| "coverThumbhash"
	| "coverUrl"
	| "intro"
	| "slug"
	| "title"
> & { items: HubItemRef[] };

/**
 * Inserts or replaces a hub from a file (ingest, imports). Items must already
 * exist. The ingest never checked `assertHubLive`; an import's compare does.
 */
export async function upsertHubRecord(
	ctx: MutationCtx,
	hub: HubRecord,
	sha256?: string
) {
	const existing = await ctx.db
		.query("library_hubs")
		.withIndex("by_slug", (q) => q.eq("slug", hub.slug))
		.unique();
	const items = await resolveHubItems(ctx, hub.slug, hub.items);
	const now = Date.now();
	const doc = {
		...hub,
		items,
		retiredAt: retiredAtAfter(existing, hub.active, now),
		sha256,
		updatedAt: now,
	};
	if (!existing) {
		await ctx.db.insert("library_hubs", doc);
		return "inserted" as const;
	}
	await ctx.db.replace("library_hubs", existing._id, doc);
	return "updated" as const;
}
