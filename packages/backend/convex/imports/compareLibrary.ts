import type { Infer } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { assertSlug } from "../admin/edits";
import { bodyOf, creditsOf, facetsOf } from "../admin/library";
import { assertSha256, assertThumbhash } from "../admin/uploads";
import { assertImageAlts } from "../library/imageAlts";
import { assertPublishable } from "../library/publishGates";
import { assertSourcesFit, type manifestSource } from "../library/sources";
import { assertHubLive, facetPairs, reviewAfterWrite } from "../library/write";
import {
	dateField,
	daysSince,
	diffViews,
	showBool,
	showDate,
	showDays,
	showHash,
	showInstant,
	showText,
	timeField,
	type View,
	type ViewField,
} from "./diff";
import { unlessSameSource } from "./imageSources";
import {
	type CompareScope,
	needUpload,
	type PlannedItem,
	parseRecord,
	planned,
	reject,
	type UploadNeed,
	versionOf,
} from "./plan";
import {
	type DropRecord,
	entryRecord,
	hubRecord,
	IMAGE_SIZES,
	MAX_TEXT_CHARS,
	sourceRecord,
} from "./records";

/**
 * Compare for the Library target: sources, entries, hubs (and narration,
 * which v1 rejects). The gates are the ingest's (`library/ingest.ts`, strict):
 * a file can't hold a draft the script would refuse.
 */

type ManifestSource = Infer<typeof manifestSource>;
type CoverKeys = Pick<
	Doc<"library_entries">,
	"cover512Key" | "cover1280Key" | "coverKey" | "coverThumbhash" | "coverUrl"
>;

const DAY_MS = 86_400_000;

/**
 * A cover as the review shows it: the image's hash, else its hosted URL.
 * Compared on the whole file name, which is the image's hash.
 */
function coverField(c: Partial<CoverKeys>): ViewField {
	const key = c.cover1280Key ?? c.coverKey;
	if (key) {
		const name = key.slice(key.lastIndexOf("/") + 1);
		return { exact: name, value: showHash(name) };
	}
	return { value: showText(c.coverUrl) };
}

/** The processed WebPs at exactly the sizes `use` needs, by size. */
function webpsFor(
	d: DropRecord,
	use: keyof typeof IMAGE_SIZES
): Map<number, { bytes: number; sha256: string }> | undefined {
	if (!d.image) {
		return;
	}
	const sizes = new Map(d.image.webp.map((w) => [w.px, w]));
	if (!IMAGE_SIZES[use].every((px) => sizes.has(px))) {
		return reject(`${d.image.name} wasn't processed at every size it needs`);
	}
	for (const w of sizes.values()) {
		assertSha256(w.sha256);
	}
	assertThumbhash(d.image.thumbhash);
	return sizes;
}

const missingFile = (d: DropRecord, part: "body" | "image", path: string) =>
	reject(d.fileErrors?.[part] ?? `${path} isn't in the drop`);

// --- Sources ---

const sourceView = (s: Infer<typeof sourceRecord>): View => ({
	Attribution: { value: s.attributionText },
	"Drop branding if adapted": { value: showBool(s.dropBrandingIfAdapted) },
	Licence: { value: s.licence },
	Logo: { value: showText(s.logoUrl) },
	Name: { value: s.name },
	Permission: { value: s.permission.replaceAll("_", " ") },
	"Refresh every": { value: showDays(s.refreshDays) },
	Website: { value: showText(s.url) },
});

export async function compareSource(
	scope: CompareScope,
	d: DropRecord
): Promise<PlannedItem> {
	const source = parseRecord(sourceRecord, d.record);
	const stored = await scope.ctx.db
		.query("library_sources")
		.withIndex("by_slug", (q) => q.eq("slug", source.slug))
		.unique();
	if (!stored) {
		assertSlug(source.slug);
	}
	const item = planned({
		baseVersion: stored ? versionOf(stored) : undefined,
		changes: stored ? diffViews(sourceView(stored), sourceView(source)) : [],
		editedBy: stored?.editedBy,
		payload: { source, type: "source" },
		slug: source.slug,
		stored,
		title: source.name,
		type: "source",
	});
	scope.dropSources.set(source.slug, source);
	return item;
}

// --- Entries ---

const showCredit = (c: ManifestSource, at = showDate) =>
	[c.source, c.pageTitle, c.author, at(c.retrievedAt), c.pageUrl]
		.filter(Boolean)
		.join(" · ");

/** Facets by axis as the editor lists them: canonical, sorted, without the primary subject. */
function authoredFacets(
	slug: string,
	primarySubject: string,
	facets: Record<string, string[]>
) {
	const byAxis: Record<string, string[]> = {};
	for (const pair of facetPairs(slug, primarySubject, facets)) {
		if (pair.axis === "subject" && pair.slug === primarySubject) {
			continue;
		}
		byAxis[pair.axis] = [...(byAxis[pair.axis] ?? []), pair.slug];
	}
	return byAxis;
}

interface EntryParts {
	credits: ManifestSource[];
	entry: Omit<
		Doc<"library_entries">,
		| "_id"
		| "_creationTime"
		| "readMin"
		| "searchText"
		| "sha256"
		| "updatedAt"
		| "editedBy"
		| "retiredAt"
		| "safetyReviewedAt"
	> & { safetyReviewedAt?: number };
	facets: Record<string, string[]>;
	markdown: string;
}

function entryView({ credits, entry: e, facets, markdown }: EntryParts): View {
	const view: View = {
		"Consent recorded": timeField(e.consentRecordedAt),
		"Content note": { value: showText(e.contentNote) },
		Cover: coverField(e),
		Credits: {
			exact:
				credits.map((c) => showCredit(c, showInstant)).join("\n") || undefined,
			value: credits.map((c) => showCredit(c)).join("\n") || undefined,
		},
		Dek: { value: e.dek },
		Kind: { value: e.kind },
		"Last reviewed": dateField(e.lastReviewedAt),
		Live: { value: showBool(e.active) },
		"New until": dateField(e.newUntil),
		"Primary subject": { value: e.primarySubject },
		Published: dateField(e.publishedAt),
		"Reflect prompt": { value: showText(e.reflectPrompt) },
		Retrieved: dateField(e.retrievedAt),
		Reuse: { value: e.reuse },
		"Story descriptor": { value: showText(e.storyDescriptor) },
		Title: { value: e.title },
	};
	for (const axis of Object.keys(facets).sort()) {
		view[`Facets · ${axis}`] = {
			value: [...(facets[axis] ?? [])].sort().join(", ") || undefined,
		};
	}
	view.Body = { long: true, value: markdown };
	return view;
}

/** The cover fields a record writes: a new upload, the stored cover kept, or none. */
function entryCover(
	scope: CompareScope,
	d: DropRecord,
	index: number,
	coverPath: string | undefined,
	stored: Doc<"library_entries"> | null
) {
	if (!coverPath) {
		return { cover: {}, uploads: [] };
	}
	const webps = webpsFor(d, "entry");
	if (!webps) {
		// Not dropped: the stored cover stays, so a copy edit needn't carry its image.
		if (stored?.cover1280Key || stored?.coverKey) {
			const { cover512Key, cover1280Key, coverKey, coverThumbhash } = stored;
			return {
				cover: { cover512Key, cover1280Key, coverKey, coverThumbhash },
				uploads: [],
			};
		}
		return missingFile(d, "image", coverPath);
	}
	const keyOf = (px: number) =>
		`library-thumb/${webps.get(px)?.sha256 ?? ""}.webp`;
	const cover = {
		cover512Key: keyOf(512),
		cover1280Key: keyOf(1280),
		coverThumbhash: d.image?.thumbhash,
	};
	const fresh = cover.cover1280Key !== stored?.cover1280Key;
	return {
		cover,
		// Called last, once every gate has passed; see `uploadsFor`.
		uploads: fresh
			? IMAGE_SIZES.entry.map((px) => ({
					bytes: webps.get(px)?.bytes ?? 0,
					index,
					key: keyOf(px),
					part: px,
				}))
			: [],
	};
}

export async function compareEntry(
	scope: CompareScope,
	d: DropRecord,
	index: number
): Promise<PlannedItem> {
	const {
		bodyPath,
		coverPath,
		decorativeImages,
		facets: rawFacets,
		sources: credits,
		...fields
	} = parseRecord(entryRecord, d.record);
	const { slug } = fields;
	const { ctx } = scope;

	const markdown = d.body ?? missingFile(d, "body", bodyPath);
	if (markdown.length > MAX_TEXT_CHARS) {
		reject(`${bodyPath} is over ${MAX_TEXT_CHARS.toLocaleString()} characters`);
	}
	const stored = await ctx.db
		.query("library_entries")
		.withIndex("by_slug", (q) => q.eq("slug", slug))
		.unique();
	if (!stored) {
		assertSlug(slug);
	}

	// The ingest's gates, on the entry as it would be written.
	assertImageAlts(slug, markdown, decorativeImages);
	const facets = authoredFacets(slug, fields.primarySubject, rawFacets);
	const resolved = await Promise.all(
		credits.map(async ({ source }) => {
			const s =
				scope.dropSources.get(source) ??
				(await ctx.db
					.query("library_sources")
					.withIndex("by_slug", (q) => q.eq("slug", source))
					.unique());
			return (
				s ??
				reject(
					`Credits an unknown source "${source}". Add it to this drop, or create it in Sources first.`
				)
			);
		})
	);
	assertSourcesFit(fields, resolved);
	const storedBody = stored ? await bodyOf(ctx, stored._id) : undefined;
	const safetyReviewedAt = reviewAfterWrite(stored, storedBody, markdown);
	if (fields.kind === "story" && fields.reuse === "original") {
		if (fields.consentRecordedAt === undefined) {
			reject(
				"A first-hand story (kind story, reuse original) needs consentRecordedAt before it can be imported."
			);
		}
	}
	if (fields.kind === "explainer" && fields.active && !safetyReviewedAt) {
		reject(
			stored?.safetyReviewedAt
				? "Its body changed, which clears the safety review, so it can't stay live. Import it with active: false, review it in the admin, then publish."
				: "An explainer can't go live until its body is safety-reviewed. Import it with active: false, review it in the admin, then publish."
		);
	}
	const { cover, uploads } = entryCover(
		scope,
		await unlessSameSource(scope, d, stored?.cover1280Key),
		index,
		coverPath,
		stored
	);
	const entry = { ...fields, ...cover };
	assertPublishable({ ...entry, safetyReviewedAt });

	const warnings: string[] = [];
	if (fields.kind === "explainer" && !safetyReviewedAt) {
		warnings.push(
			stored?.safetyReviewedAt
				? "The body changed, so its safety review is cleared. It goes back to Needs review."
				: "Goes in as Needs review: it can't go live until someone signs off its body."
		);
	}
	const [first] = credits;
	const refreshDays = first && resolved[0]?.refreshDays;
	if (
		refreshDays &&
		fields.reuse === "verbatim" &&
		(first.retrievedAt ?? 0) < scope.now - refreshDays * DAY_MS
	) {
		warnings.push(
			first.retrievedAt === undefined
				? `Verbatim copy with no retrievedAt; ${resolved[0]?.name} asks for a refresh every ${showDays(refreshDays)}.`
				: `Verbatim copy retrieved ${daysSince(first.retrievedAt, scope.now)} days ago; ${resolved[0]?.name} asks for a refresh every ${showDays(refreshDays)}.`
		);
	}

	const after = entryView({ credits, entry, facets, markdown });
	const before = stored
		? entryView({
				credits: await creditsOf(ctx, stored._id, new Map()),
				entry: stored,
				facets: await facetsOf(ctx, stored),
				markdown: storedBody ?? "",
			})
		: undefined;
	scope.dropEntries.add(slug);
	return planned({
		baseVersion: stored ? versionOf(stored) : undefined,
		changes: before ? diffViews(before, after) : [],
		editedBy: stored?.editedBy,
		media:
			d.image && uploads.length > 0
				? [{ bytes: d.image.bytes, kind: "cover", name: d.image.name }]
				: undefined,
		payload: {
			decorativeImages,
			facets: rawFacets,
			fields: entry,
			markdown,
			sources: credits,
			type: "entry",
		},
		slug,
		stored,
		title: fields.title,
		type: "entry",
		uploads: uploads.map((u) => needUpload(scope, u)),
		warnings,
	});
}

// --- Hubs ---

type HubItemRef = Infer<typeof hubRecord>["items"][number];

const hubView = (
	h: Pick<Doc<"library_hubs">, "active" | "intro" | "title"> &
		Partial<CoverKeys>,
	items: HubItemRef[]
): View => ({
	Cover: coverField(h),
	Intro: { value: h.intro },
	Items: {
		value: items.map((i) => `${i.kind} ${i.ref}`).join(" · ") || undefined,
	},
	Live: { value: showBool(h.active) },
	Title: { value: h.title },
});

async function storedHubItems(
	scope: CompareScope,
	h: Doc<"library_hubs">
): Promise<HubItemRef[]> {
	return await Promise.all(
		h.items.map(async (item) => ({
			kind: item.kind,
			ref:
				(item.kind === "entry"
					? await scope.ctx.db.get("library_entries", item.entryId)
					: await scope.ctx.db.get("audio_tracks", item.audioTrackId)
				)?.slug ?? "(deleted)",
		}))
	);
}

export async function compareHub(
	scope: CompareScope,
	d: DropRecord,
	index: number
): Promise<PlannedItem> {
	const { coverPath, ...hub } = parseRecord(hubRecord, d.record);
	const { ctx } = scope;
	const stored = await ctx.db
		.query("library_hubs")
		.withIndex("by_slug", (q) => q.eq("slug", hub.slug))
		.unique();
	if (!stored) {
		assertSlug(hub.slug);
	}
	for (const { kind, ref } of hub.items) {
		const found =
			kind === "entry"
				? scope.dropEntries.has(ref) ||
					(await ctx.db
						.query("library_entries")
						.withIndex("by_slug", (q) => q.eq("slug", ref))
						.unique())
				: await ctx.db
						.query("audio_tracks")
						.withIndex("by_slug", (q) => q.eq("slug", ref))
						.unique();
		if (!found) {
			reject(
				`Holds an unknown ${kind === "entry" ? "entry" : "track"} "${ref}". Add it to this drop, or create it first.`
			);
		}
	}
	if (hub.active) {
		assertHubLive(hub);
	}

	let cover: Partial<CoverKeys> = {};
	let upload: UploadNeed | undefined;
	if (coverPath) {
		const webp = webpsFor(
			await unlessSameSource(scope, d, stored?.cover1280Key),
			"hub"
		)?.get(1280);
		if (webp) {
			const key = `hub-cover/${webp.sha256}.webp`;
			cover = { cover1280Key: key, coverThumbhash: d.image?.thumbhash };
			if (key !== stored?.cover1280Key) {
				upload = { bytes: webp.bytes, index, key, part: 1280 };
			}
		} else if (stored?.cover1280Key || stored?.coverKey) {
			const { cover1280Key, coverKey, coverThumbhash } = stored;
			cover = { cover1280Key, coverKey, coverThumbhash };
		} else {
			missingFile(d, "image", coverPath);
		}
	}
	const next = { ...hub, ...cover };
	return planned({
		baseVersion: stored ? versionOf(stored) : undefined,
		changes: stored
			? diffViews(
					hubView(stored, await storedHubItems(scope, stored)),
					hubView(next, hub.items)
				)
			: [],
		editedBy: stored?.editedBy,
		media:
			upload && d.image
				? [{ bytes: d.image.bytes, kind: "cover", name: d.image.name }]
				: undefined,
		payload: { hub: next, type: "hub" },
		slug: hub.slug,
		stored,
		title: hub.title,
		type: "hub",
		uploads: upload ? [needUpload(scope, upload)] : undefined,
	});
}

// --- Narration ---

/** Narration needs ffmpeg for its 30s preview cut, so it stays in the script for v1. */
export function compareNarration(): never {
	return reject(
		"Narration still goes through scripts/library/ingest.ts: its 30-second preview is cut with ffmpeg, which the admin can't run yet."
	);
}
