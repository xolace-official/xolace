// @vitest-environment edge-runtime
/**
 * The admin content API (admin v1 step 6): every public `convex/admin/*`
 * function rejects anyone without the admin role, and the editors' writes
 * keep the ingest's publish gates.
 */
import { makeFunctionReference } from "convex/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import {
	asAdmin,
	asUnauthed,
	asUser,
	makeIdentity,
} from "../test/harness.helpers";

// Writes schedule index jobs; on fake timers they never run.
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const NOT_AUTHENTICATED = /not_authenticated|Not authenticated/;
const FORBIDDEN = /forbidden|Admin role required/;

/**
 * Valid args for every public admin function. The guard runs after argument
 * validation, so each needs real-shaped args; the coverage test below fails
 * when a new function has no entry here.
 */
const SAMPLE_ARGS: Record<string, Record<string, unknown>> = {
	"admin/audio:list": {},
	"admin/audio:markSafetyReviewed": { slug: "x" },
	"admin/audio:publish": { slug: "x" },
	"admin/audio:retire": { slug: "x" },
	"admin/audio:save": {
		slug: "x",
		track: { featured: false, tags: [], title: "x", topic: "x" },
	},
	"admin/audio:topics": {},
	"admin/hubs:create": { slug: "x", title: "x" },
	"admin/hubs:list": {},
	"admin/hubs:publish": { slug: "x" },
	"admin/hubs:retire": { slug: "x" },
	"admin/hubs:save": { intro: "", items: [], slug: "x", title: "x" },
	"admin/library:bodies": {},
	"admin/library:create": {
		kind: "advice",
		primarySubject: "x",
		slug: "x",
		title: "x",
	},
	"admin/library:list": {},
	"admin/library:markSafetyReviewed": { slug: "x" },
	"admin/library:publish": { slug: "x" },
	"admin/library:recordConsent": { slug: "x" },
	"admin/library:retire": { slug: "x" },
	"admin/library:save": {
		credits: [],
		entry: { dek: "", primarySubject: "x", title: "x" },
		facets: {},
		markdown: "",
		slug: "x",
	},
	"admin/sources:create": { slug: "x", source: source() },
	"admin/sources:list": {},
	"admin/sources:save": { slug: "x", source: source() },
};

interface Registered {
	isAction?: boolean;
	isMutation?: boolean;
	isPublic?: boolean;
	isQuery?: boolean;
}

/** Every public function exported from `convex/admin/*`, as `admin/<file>:<name>`. */
function publicAdminFunctions() {
	const modules = import.meta.glob<Record<string, unknown>>("./*.ts", {
		eager: true,
	});
	const found: { kind: "query" | "mutation" | "action"; path: string }[] = [];
	for (const [file, exports] of Object.entries(modules)) {
		if (file.includes(".test.")) {
			continue;
		}
		const module = file.replace(/^\.\//, "admin/").replace(/\.ts$/, "");
		for (const [name, fn] of Object.entries(exports)) {
			const f = fn as Registered;
			if (!f?.isPublic) {
				continue;
			}
			const kind = f.isQuery ? "query" : f.isMutation ? "mutation" : "action";
			found.push({ kind, path: `${module}:${name}` });
		}
	}
	return found;
}

function call(
	t: ReturnType<typeof asUser> | ReturnType<typeof asUnauthed>,
	kind: "query" | "mutation" | "action",
	path: string
) {
	const args = SAMPLE_ARGS[path];
	if (kind === "query") {
		return t.query(makeFunctionReference<"query">(path), args);
	}
	if (kind === "mutation") {
		return t.mutation(makeFunctionReference<"mutation">(path), args);
	}
	return t.action(makeFunctionReference<"action">(path), args);
}

describe("admin guard", () => {
	const fns = publicAdminFunctions();

	it("has sample args for every public admin function", () => {
		expect(fns.map((f) => f.path).sort()).toEqual(
			Object.keys(SAMPLE_ARGS).sort()
		);
	});

	it.each(fns)("$path rejects anonymous callers", async ({ kind, path }) => {
		await expect(call(asUnauthed(), kind, path)).rejects.toThrow(
			NOT_AUTHENTICATED
		);
	});

	it.each(fns)("$path rejects signed-in non-admins", async ({ kind, path }) => {
		await expect(call(asUser(), kind, path)).rejects.toThrow(FORBIDDEN);
	});
});

function source(extra: Partial<Doc<"library_sources">> = {}) {
	return {
		attributionText: "Contains public sector information (OGL v3.0)",
		dropBrandingIfAdapted: true,
		licence: "OGL v3.0",
		name: "NHS",
		permission: "not_required" as const,
		...extra,
	};
}

const credit = { pageTitle: "Panic disorder", source: "nhs" };

type Admin = ReturnType<typeof asAdmin>;

async function entryRow(t: Admin, slug: string) {
	const rows = await t.query(api.admin.library.list, {});
	const row = rows.find((r) => r.slug === slug);
	if (!row) {
		throw new Error(`no row ${slug}`);
	}
	return row;
}

/** An admin with the NHS source and a draft explainer, saved with copy, a credit and a body. */
async function withExplainer() {
	const t = asAdmin();
	await t.mutation(api.admin.sources.create, { slug: "nhs", source: source() });
	await t.mutation(api.admin.library.create, {
		kind: "explainer",
		primarySubject: "anxiety",
		slug: "what-is-panic",
		title: "What is panic?",
	});
	await t.mutation(api.admin.library.save, {
		credits: [credit],
		entry: {
			dek: "A short guide",
			primarySubject: "anxiety",
			title: "What is panic?",
		},
		facets: { emotion: ["anxiety"] },
		markdown: "Panic is a rush of fear.",
		slug: "what-is-panic",
	});
	return t;
}

describe("admin/library", () => {
	it("creates a draft and saves it with credits, facets and body", async () => {
		const t = await withExplainer();
		const row = await entryRow(t, "what-is-panic");
		expect(row).toMatchObject({
			active: false,
			credits: [credit],
			dek: "A short guide",
			editedBy: makeIdentity().subject,
			facets: { emotion: ["anxiety"] },
			reuse: "adapted",
		});
		expect(row.retiredAt).toBeUndefined();
		expect(await t.query(api.admin.library.bodies, {})).toEqual({
			"what-is-panic": "Panic is a rush of fear.",
		});
	});

	it("lets a draft be saved half-done", async () => {
		const t = asAdmin();
		await t.mutation(api.admin.library.create, {
			kind: "advice",
			primarySubject: "anxiety",
			slug: "a-draft",
			title: "A draft",
		});
		// adapted with no credits and an image without alt: fine while a draft
		await t.mutation(api.admin.library.save, {
			credits: [],
			entry: { dek: "", primarySubject: "anxiety", title: "A draft" },
			facets: {},
			markdown: "![](cover.png)",
			slug: "a-draft",
		});
		await expect(
			t.mutation(api.admin.library.publish, { slug: "a-draft" })
		).rejects.toThrow(/needs a title and dek/);
	});

	it("won't publish an entry with an empty body", async () => {
		const t = await withExplainer();
		await t.mutation(api.admin.library.create, {
			kind: "advice",
			primarySubject: "anxiety",
			slug: "blank",
			title: "Blank",
		});
		await t.mutation(api.admin.library.save, {
			credits: [credit],
			entry: { dek: "Nothing yet", primarySubject: "anxiety", title: "Blank" },
			facets: {},
			markdown: "  ",
			slug: "blank",
		});
		await expect(
			t.mutation(api.admin.library.publish, { slug: "blank" })
		).rejects.toThrow(/needs a body/);
	});

	it("rejects a duplicate or malformed slug", async () => {
		const t = await withExplainer();
		const args = {
			kind: "advice" as const,
			primarySubject: "anxiety",
			title: "x",
		};
		await expect(
			t.mutation(api.admin.library.create, { ...args, slug: "what-is-panic" })
		).rejects.toThrow(/already exists/);
		await expect(
			t.mutation(api.admin.library.create, { ...args, slug: "Not A Slug" })
		).rejects.toThrow(/not a valid slug/);
	});

	it("keeps an explainer down until its body is safety-reviewed", async () => {
		const t = await withExplainer();
		await expect(
			t.mutation(api.admin.library.publish, { slug: "what-is-panic" })
		).rejects.toThrow(/safetyReviewedAt/);

		await t.mutation(api.admin.library.markSafetyReviewed, {
			slug: "what-is-panic",
		});
		await t.mutation(api.admin.library.publish, { slug: "what-is-panic" });
		const live = await entryRow(t, "what-is-panic");
		expect(live.active).toBe(true);
		expect(live.publishedAt).toBeTypeOf("number");
	});

	it("won't change a live explainer's body, since the edit drops its review", async () => {
		const t = await withExplainer();
		await t.mutation(api.admin.library.markSafetyReviewed, {
			slug: "what-is-panic",
		});
		await t.mutation(api.admin.library.publish, { slug: "what-is-panic" });
		const save = (markdown: string) =>
			t.mutation(api.admin.library.save, {
				credits: [credit],
				entry: {
					dek: "A new dek",
					primarySubject: "anxiety",
					title: "What is panic?",
				},
				facets: {},
				markdown,
				slug: "what-is-panic",
			});

		await save("Panic is a rush of fear."); // same body: the review stands
		expect((await entryRow(t, "what-is-panic")).dek).toBe("A new dek");
		await expect(save("A rewritten body.")).rejects.toThrow(/safetyReviewedAt/);
	});

	it("publishes a first-hand story only once consent is recorded", async () => {
		const t = asAdmin();
		await t.mutation(api.admin.sources.create, {
			slug: "xolace",
			source: source({ licence: "Xolace original", name: "Xolace" }),
		});
		await t.mutation(api.admin.library.create, {
			kind: "story",
			primarySubject: "loneliness",
			slug: "first-term",
			title: "My first term",
		});
		await t.mutation(api.admin.library.save, {
			credits: [{ pageTitle: "My first term", source: "xolace" }],
			entry: {
				dek: "A student's story",
				primarySubject: "loneliness",
				title: "My first term",
			},
			facets: {},
			markdown: "It was quiet.",
			slug: "first-term",
		});
		await expect(
			t.mutation(api.admin.library.publish, { slug: "first-term" })
		).rejects.toThrow(/consentRecordedAt/);

		await t.mutation(api.admin.library.recordConsent, { slug: "first-term" });
		await t.mutation(api.admin.library.publish, { slug: "first-term" });
		expect((await entryRow(t, "first-term")).active).toBe(true);
	});

	it("retires a live entry and remembers that it was live", async () => {
		const t = await withExplainer();
		await t.mutation(api.admin.library.markSafetyReviewed, {
			slug: "what-is-panic",
		});
		await t.mutation(api.admin.library.publish, { slug: "what-is-panic" });
		await t.mutation(api.admin.library.retire, { slug: "what-is-panic" });
		const row = await entryRow(t, "what-is-panic");
		expect(row.active).toBe(false);
		expect(row.retiredAt).toBeTypeOf("number");
	});

	it("clears the import hash, so an old file shows as Changed", async () => {
		const t = await withExplainer();
		await t.run((ctx) =>
			ctx.db
				.query("library_entries")
				.withIndex("by_slug", (q) => q.eq("slug", "what-is-panic"))
				.unique()
				.then((e) => ctx.db.patch("library_entries", e!._id, { sha256: "old" }))
		);
		await t.mutation(api.admin.library.markSafetyReviewed, {
			slug: "what-is-panic",
		});
		const stored = await t.run((ctx) =>
			ctx.db
				.query("library_entries")
				.withIndex("by_slug", (q) => q.eq("slug", "what-is-panic"))
				.unique()
		);
		expect(stored?.sha256).toBeUndefined();
	});
});

describe("admin/hubs", () => {
	it("resolves items by slug and gates Publish on copy and items", async () => {
		const t = await withExplainer();
		await t.mutation(api.admin.hubs.create, {
			slug: "exam-season",
			title: "Exam season",
		});
		await expect(
			t.mutation(api.admin.hubs.publish, { slug: "exam-season" })
		).rejects.toThrow(/title and intro/);
		await expect(
			t.mutation(api.admin.hubs.save, {
				intro: "For the weeks before exams.",
				items: [{ kind: "entry", ref: "no-such-entry" }],
				slug: "exam-season",
				title: "Exam season",
			})
		).rejects.toThrow(/unknown entry "no-such-entry"/);

		await t.mutation(api.admin.hubs.save, {
			intro: "For the weeks before exams.",
			items: [{ kind: "entry", ref: "what-is-panic" }],
			slug: "exam-season",
			title: "Exam season",
		});
		await t.mutation(api.admin.hubs.publish, { slug: "exam-season" });
		const [hub] = await t.query(api.admin.hubs.list, {});
		expect(hub).toMatchObject({
			active: true,
			items: [{ kind: "entry", ref: "what-is-panic" }],
		});
	});
});

describe("admin/sources", () => {
	it("replaces a source's terms and clears optional fields left out", async () => {
		const t = asAdmin();
		await t.mutation(api.admin.sources.create, {
			slug: "nhs",
			source: source({ refreshDays: 7 }),
		});
		await t.mutation(api.admin.sources.save, {
			slug: "nhs",
			source: source({ permission: "granted" }),
		});
		const [row] = await t.query(api.admin.sources.list, {});
		expect(row.permission).toBe("granted");
		expect(row.refreshDays).toBeUndefined();
	});
});

describe("admin/audio", () => {
	async function withTrack(extra: Partial<Doc<"audio_tracks">> = {}) {
		const t = asAdmin();
		await t.run((ctx) =>
			ctx.db.insert("audio_tracks", {
				active: false,
				durationSec: 300,
				family: "support",
				key: "support/grounding.m4a",
				sha256: "audio-sha",
				slug: "grounding",
				sourceTags: [],
				tags: ["anxiety"],
				thumbKey: "thumb/x.webp",
				thumbSha256: "thumb-sha",
				tier: 3,
				title: "Grounding",
				topic: "audio_topic_grief",
				...extra,
			})
		);
		return t;
	}

	const saveArgs = {
		slug: "grounding",
		track: {
			featured: true,
			tags: ["anxiety", "calm"],
			tier: 3,
			title: "Grounding, slowly",
			topic: "audio_topic_grief",
		},
	};

	it("saves metadata and keeps the audio hash", async () => {
		const t = await withTrack();
		await t.mutation(api.admin.audio.save, saveArgs);
		const [row] = await t.query(api.admin.audio.list, {});
		expect(row).toMatchObject({ featured: true, title: "Grounding, slowly" });
		const stored = await t.run((ctx) => ctx.db.query("audio_tracks").first());
		expect(stored?.sha256).toBe("audio-sha");
		expect(stored?.searchText).toContain("calm");
	});

	it("rejects the other family's fields and a topic of the wrong family", async () => {
		const t = await withTrack();
		await expect(
			t.mutation(api.admin.audio.save, {
				...saveArgs,
				track: { ...saveArgs.track, whatItsFor: "Sleep" },
			})
		).rejects.toThrow(/for music tracks/);
		await expect(
			t.mutation(api.admin.audio.save, {
				...saveArgs,
				track: { ...saveArgs.track, topic: "music_topic_grief" },
			})
		).rejects.toThrow(/not a support topic/);
	});

	it("can retire a live track whose stored topic is no longer catalogued", async () => {
		const t = await withTrack({
			active: true,
			safetyReviewedAt: 1,
			topic: "audio_topic_retired_topic",
		});
		await t.mutation(api.admin.audio.retire, { slug: "grounding" });
		const [row] = await t.query(api.admin.audio.list, {});
		expect(row.active).toBe(false);
	});

	it("keeps a licence's proof only while it is the same licence", async () => {
		const licence = {
			acquiredAt: 1,
			artist: "Ana",
			attributionRequired: false,
			attributionText: "Music by Ana",
			licenceName: "Pixabay",
			licenceUrl: "https://pixabay.com/service/license/",
			source: "pixabay",
			sourceUrl: "https://pixabay.com/music/1",
		};
		const t = await withTrack({
			family: "music",
			licence: { ...licence, licenceRef: "receipt-1" },
			tier: undefined,
			topic: "music_topic_sleep_rest",
		});
		const save = (l: typeof licence & { licenceRef?: string }) =>
			t.mutation(api.admin.audio.save, {
				slug: "grounding",
				track: {
					featured: false,
					licence: l,
					tags: [],
					title: "Grounding",
					topic: "music_topic_sleep_rest",
				},
			});
		await save({ ...licence, attributionText: "Music: Ana" });
		expect(
			(await t.query(api.admin.audio.list, {}))[0].licence?.licenceRef
		).toBe("receipt-1");
		// The client echoes the old proof back from the read: a new licence still drops it.
		await save({ ...licence, artist: "Someone else", licenceRef: "receipt-1" });
		expect(
			(await t.query(api.admin.audio.list, {}))[0].licence?.licenceRef
		).toBeUndefined();
	});

	it("won't keep a music track live with a blank licence artist or name", async () => {
		const licence = {
			acquiredAt: 1,
			artist: "Ana",
			attributionRequired: false,
			attributionText: "Music by Ana",
			licenceName: "Pixabay",
			licenceUrl: "https://pixabay.com/service/license/",
			source: "pixabay",
			sourceUrl: "https://pixabay.com/music/1",
		};
		const t = await withTrack({
			active: true,
			family: "music",
			licence,
			tier: undefined,
			topic: "music_topic_sleep_rest",
		});
		await expect(
			t.mutation(api.admin.audio.save, {
				slug: "grounding",
				track: {
					featured: false,
					licence: { ...licence, artist: " " },
					tags: [],
					title: "Grounding",
					topic: "music_topic_sleep_rest",
				},
			})
		).rejects.toThrow(/licence's artist, name and source/);
	});

	it("clears the New shelf date when a save leaves it out", async () => {
		const t = await withTrack({ newUntil: 1 });
		await t.mutation(api.admin.audio.save, saveArgs);
		const [row] = await t.query(api.admin.audio.list, {});
		expect(row.newUntil).toBeUndefined();
	});

	it("keeps a tier 3 track down until it is safety-reviewed", async () => {
		const t = await withTrack();
		await expect(
			t.mutation(api.admin.audio.publish, { slug: "grounding" })
		).rejects.toThrow(/needs a safety review/);
		await t.mutation(api.admin.audio.markSafetyReviewed, { slug: "grounding" });
		await t.mutation(api.admin.audio.publish, { slug: "grounding" });
		await t.mutation(api.admin.audio.retire, { slug: "grounding" });
		const [row] = await t.query(api.admin.audio.list, {});
		expect(row.active).toBe(false);
		expect(row.retiredAt).toBeTypeOf("number");
	});

	it("lists every catalogued topic, with the cover where a row has one", async () => {
		const t = asAdmin();
		await t.run((ctx) =>
			ctx.db.insert("topics", {
				slug: "grief",
				thumbKey: "thumb/g.webp",
				thumbSha256: "g",
				title: "Grief and loss",
			})
		);
		const topics = await t.query(api.admin.audio.topics, {});
		expect(topics.find((x) => x.slug === "grief")).toEqual({
			hasCover: true,
			slug: "grief",
			title: "Grief and loss",
		});
		expect(topics.filter((x) => x.hasCover)).toHaveLength(1);
	});
});
