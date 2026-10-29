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
import { r2 } from "../ai/paths/audioTracks";
import {
	asAdmin,
	asUnauthed,
	asUser,
	makeIdentity,
} from "../test/harness.helpers";

// Writes schedule index jobs; on fake timers they never run. R2 is faked at
// the `r2` seam: signing needs credentials and deletes run in a component.
beforeEach(() => {
	vi.useFakeTimers();
	vi.spyOn(r2, "getUrl").mockImplementation(
		async (key) => `https://r2.test/${key}`
	);
	vi.spyOn(r2, "generateUploadUrl").mockImplementation(async (key) => ({
		key: key ?? "random",
		url: `https://r2.test/put/${key}`,
	}));
	vi.spyOn(r2, "deleteObject").mockResolvedValue(undefined);
});
afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

const SHA = "a".repeat(64);
const OTHER_SHA = "b".repeat(64);
const THUMB = { sha256: SHA, thumbhash: "1QcSHQRnh493V4dIh4eXh1h4kJUI" };

const NOT_AUTHENTICATED = /not_authenticated|Not authenticated/;
const FORBIDDEN = /forbidden|Admin role required/;

/**
 * Valid args for every public admin function. The guard runs after argument
 * validation, so each needs real-shaped args; the coverage test below fails
 * when a new function has no entry here.
 */
const SAMPLE_ARGS: Record<string, Record<string, unknown>> = {
	"admin/audio:create": {
		audio: { durationSec: 1, key: "x", sha256: "x" },
		family: "music",
		slug: "x",
		thumb: { sha256: "x", thumbhash: "x" },
		title: "x",
		topic: "x",
	},
	"admin/audio:list": {},
	"admin/audio:markSafetyReviewed": { slug: "x" },
	"admin/audio:media": { linkWindow: 0, slug: "x" },
	"admin/audio:publish": { slug: "x" },
	"admin/audio:replaceAudio": {
		durationSec: 1,
		key: "x",
		sha256: "x",
		slug: "x",
	},
	"admin/audio:replaceThumb": {
		slug: "x",
		thumb: { sha256: "x", thumbhash: "x" },
	},
	"admin/audio:replaceTopicCover": {
		slug: "x",
		thumb: { sha256: "x", thumbhash: "x" },
	},
	"admin/audio:retire": { slug: "x" },
	"admin/audio:save": {
		slug: "x",
		track: { featured: false, tags: [], title: "x", topic: "x" },
	},
	"admin/audio:topics": { linkWindow: 0 },
	"admin/hubs:cover": { linkWindow: 0, slug: "x" },
	"admin/hubs:create": { slug: "x", title: "x" },
	"admin/hubs:list": {},
	"admin/hubs:publish": { slug: "x" },
	"admin/hubs:replaceCover": { sha256: "x", slug: "x", thumbhash: "x" },
	"admin/hubs:retire": { slug: "x" },
	"admin/hubs:save": { intro: "", items: [], slug: "x", title: "x" },
	"admin/imports:apply": { number: 1 },
	"admin/imports:compare": { files: "", records: [], target: "library" },
	"admin/imports:discard": { number: 1 },
	"admin/imports:get": { number: 1 },
	"admin/imports:list": {},
	// convex-test reads an id's table from its suffix.
	"admin/imports:retry": { itemId: "1import_items", number: 1 },
	"admin/imports:setSkipped": { itemIds: [], number: 1, skipped: true },
	"admin/imports:uploaded": { number: 1 },
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
	"admin/searchIndex:removeStale": { index: "exercises" },
	"admin/searchIndex:start": { index: "exercises" },
	"admin/searchIndex:status": {},
	"admin/sources:create": { slug: "x", source: source() },
	"admin/sources:list": {},
	"admin/sources:save": { slug: "x", source: source() },
	"admin/uploads:audioUploadUrl": { ext: "mp3", family: "music", slug: "x" },
	"admin/uploads:discardAudio": { key: "x" },
	"admin/uploads:imageUploadUrl": { sha256: "x", use: "thumb" },
};

interface Registered {
	isAction?: boolean;
	isMutation?: boolean;
	isPublic?: boolean;
	isQuery?: boolean;
}

/** Every public function exported from `convex/admin/*`, as `admin/<file>:<name>`. */
function publicAdminFunctions() {
	// Eager imports run a module, so other test files stay out of the glob.
	const modules = import.meta.glob<Record<string, unknown>>(
		["./*.ts", "!./*.test.ts"],
		{ eager: true }
	);
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

		// A live original keeps its Xolace credit.
		await expect(
			t.mutation(api.admin.library.save, {
				credits: [],
				entry: {
					dek: "A student's story",
					primarySubject: "loneliness",
					title: "My first term",
				},
				facets: {},
				markdown: "It was quiet.",
				slug: "first-term",
			})
		).rejects.toThrow(/needs at least 1 source/);
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

	it("saves a music track's secondary topic, only when it is another music topic", async () => {
		const sound = { energy: 1, heard: "Soft piano.", vocals: "none" as const };
		const t = await withTrack({
			family: "music",
			slug: "grounding",
			sound,
			tier: undefined,
			topic: "music_topic_calm_peace",
		});
		const music = {
			...saveArgs,
			track: {
				featured: false,
				tags: [],
				title: "Soft piano",
				topic: "music_topic_calm_peace",
			},
		};
		await t.mutation(api.admin.audio.save, {
			...music,
			track: { ...music.track, secondaryTopic: "music_topic_meditation" },
		});
		const [row] = await t.query(api.admin.audio.list, {});
		expect(row.secondaryTopic).toBe("music_topic_meditation");
		// The editor never sends the listening facts; a save keeps them.
		expect(row.sound).toEqual(sound);
		for (const secondaryTopic of [
			"music_topic_calm_peace",
			"audio_topic_grief",
			"music_topic_not_catalogued",
		]) {
			await expect(
				t.mutation(api.admin.audio.save, {
					...music,
					track: { ...music.track, secondaryTopic },
				})
			).rejects.toThrow(/secondary topic/);
		}
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
		const topics = await t.query(api.admin.audio.topics, { linkWindow: 0 });
		expect(topics.find((x) => x.slug === "grief")).toEqual({
			coverUrl: "https://r2.test/thumb/g.webp",
			families: ["support"],
			hasCover: true,
			slug: "grief",
			title: "Grief and loss",
		});
		expect(topics.filter((x) => x.hasCover)).toHaveLength(1);
	});

	it("lists only the families a topic is catalogued for", async () => {
		const topics = await asAdmin().query(api.admin.audio.topics, {
			linkWindow: 0,
		});
		const families = (slug: string) =>
			topics.find((x) => x.slug === slug)?.families;
		expect(families("sleep_rest")).toEqual(["music"]);
		expect(families("grief")).toEqual(["support"]);
		expect(families("sadness")).toEqual(["music", "support"]);
		// Every listed topic is usable by at least one family.
		for (const topic of topics) {
			expect(topic.families.length).toBeGreaterThan(0);
		}
	});
});

describe("admin media", () => {
	async function withSupportTrack(extra: Partial<Doc<"audio_tracks">> = {}) {
		const t = asAdmin();
		await t.run((ctx) =>
			ctx.db.insert("audio_tracks", {
				active: false,
				durationSec: 300,
				family: "support",
				key: "support/grounding/old.m4a",
				safetyReviewedAt: 1,
				sha256: OTHER_SHA,
				slug: "grounding",
				sourceTags: [],
				tags: [],
				thumbKey: "thumb/x.webp",
				thumbSha256: "x",
				tier: 2,
				title: "Grounding",
				topic: "audio_topic_grief",
				...extra,
			})
		);
		return t;
	}

	const stored = (t: Admin) =>
		t.run((ctx) => ctx.db.query("audio_tracks").first());

	it("picks the image key from the hash and the audio key from the track", async () => {
		const t = asAdmin();
		expect(
			await t.mutation(api.admin.uploads.imageUploadUrl, {
				sha256: SHA,
				use: "hubCover",
			})
		).toEqual({
			key: `hub-cover/${SHA}.webp`,
			url: `https://r2.test/put/hub-cover/${SHA}.webp`,
		});
		await expect(
			t.mutation(api.admin.uploads.imageUploadUrl, {
				sha256: "../../etc",
				use: "thumb",
			})
		).rejects.toThrow(/not a hex SHA-256/);
		const { key } = await t.mutation(api.admin.uploads.audioUploadUrl, {
			ext: "mp3",
			family: "music",
			slug: "rain",
		});
		expect(key).toMatch(/^music\/rain\/[0-9a-f-]{36}\.mp3$/);
		await expect(
			t.mutation(api.admin.uploads.audioUploadUrl, {
				ext: "mp3",
				family: "music",
				slug: "../rain",
			})
		).rejects.toThrow(/not a valid slug/);
	});

	it("creates a music draft without its licence, but won't publish it", async () => {
		const t = asAdmin();
		const create = (key: string) =>
			t.mutation(api.admin.audio.create, {
				audio: { durationSec: 118, key, sha256: SHA },
				family: "music",
				slug: "rain",
				thumb: THUMB,
				title: "Rain",
				topic: "music_topic_sleep_rest",
			});
		await expect(create("support/rain/a.mp3")).rejects.toThrow(
			/wasn't uploaded for music\/rain/
		);
		await create("music/rain/a.mp3");
		expect(await stored(t)).toMatchObject({
			active: false,
			editedBy: makeIdentity().subject,
			key: "music/rain/a.mp3",
			sha256: SHA,
			thumbhash: THUMB.thumbhash,
			thumbKey: `thumb/${SHA}.webp`,
			thumbSha256: SHA,
		});
		await expect(create("music/rain/b.mp3")).rejects.toThrow(/already exists/);
		await expect(
			t.mutation(api.admin.audio.publish, { slug: "rain" })
		).rejects.toThrow(/music needs a licence/);
	});

	it("swaps in new audio, dropping the old file, the safety review and the old loudness", async () => {
		const t = await withSupportTrack({ loudness: { lufs: -14, truePeak: -1 } });
		await t.mutation(api.admin.audio.replaceAudio, {
			durationSec: 240,
			key: "support/grounding/new.m4a",
			sha256: SHA,
			slug: "grounding",
		});
		expect(await stored(t)).toMatchObject({
			durationSec: 240,
			key: "support/grounding/new.m4a",
			sha256: SHA,
		});
		expect((await stored(t))?.safetyReviewedAt).toBeUndefined();
		expect((await stored(t))?.loudness).toBeUndefined();
		expect(r2.deleteObject).toHaveBeenCalledWith(
			expect.anything(),
			"support/grounding/old.m4a"
		);
	});

	it("keeps the stored audio when the same file comes back", async () => {
		const t = await withSupportTrack();
		await t.mutation(api.admin.audio.replaceAudio, {
			durationSec: 300,
			key: "support/grounding/again.m4a",
			sha256: OTHER_SHA,
			slug: "grounding",
		});
		expect((await stored(t))?.key).toBe("support/grounding/old.m4a");
		expect(r2.deleteObject).toHaveBeenCalledWith(
			expect.anything(),
			"support/grounding/again.m4a"
		);
	});

	it("never deletes the stored audio when the same upload is sent again", async () => {
		const t = await withSupportTrack();
		await t.mutation(api.admin.audio.replaceAudio, {
			durationSec: 300,
			key: "support/grounding/old.m4a",
			sha256: OTHER_SHA,
			slug: "grounding",
		});
		expect((await stored(t))?.key).toBe("support/grounding/old.m4a");
		expect(r2.deleteObject).not.toHaveBeenCalled();
	});

	it("won't swap the audio of a live track that then needs a review", async () => {
		const t = await withSupportTrack({ active: true, tier: 3 });
		await expect(
			t.mutation(api.admin.audio.replaceAudio, {
				durationSec: 240,
				key: "support/grounding/new.m4a",
				sha256: SHA,
				slug: "grounding",
			})
		).rejects.toThrow(/needs a safety review/);
		expect((await stored(t))?.key).toBe("support/grounding/old.m4a");
	});

	it("points a track and a topic at an uploaded thumbnail", async () => {
		const t = await withSupportTrack();
		await t.mutation(api.admin.audio.replaceThumb, {
			slug: "grounding",
			thumb: THUMB,
		});
		expect((await stored(t))?.thumbKey).toBe(`thumb/${SHA}.webp`);
		expect(
			await t.query(api.admin.audio.media, { linkWindow: 0, slug: "grounding" })
		).toEqual({
			audioUrl: "https://r2.test/support/grounding/old.m4a",
			thumbUrl: `https://r2.test/thumb/${SHA}.webp`,
		});

		await t.mutation(api.admin.audio.replaceTopicCover, {
			slug: "grief",
			thumb: THUMB,
		});
		const topics = await t.query(api.admin.audio.topics, { linkWindow: 0 });
		expect(topics.find((x) => x.slug === "grief")).toMatchObject({
			coverUrl: `https://r2.test/thumb/${SHA}.webp`,
			hasCover: true,
		});
		await expect(
			t.mutation(api.admin.audio.replaceTopicCover, {
				slug: "not-a-topic",
				thumb: THUMB,
			})
		).rejects.toThrow(/not found/);
		await expect(
			t.mutation(api.admin.audio.replaceThumb, {
				slug: "grounding",
				thumb: { ...THUMB, thumbhash: "<script>" },
			})
		).rejects.toThrow(/ThumbHash/);
	});

	it("discards a rejected audio upload, never the track's own file", async () => {
		const t = await withSupportTrack();
		const discard = (key: string) =>
			t.mutation(api.admin.uploads.discardAudio, { key });
		const uuid = "0f8fad5b-d9cb-469f-a165-70867728950e";
		await discard(`support/grounding/${uuid}.m4a`);
		expect(r2.deleteObject).toHaveBeenCalledWith(
			expect.anything(),
			`support/grounding/${uuid}.m4a`
		);
		vi.mocked(r2.deleteObject).mockClear();
		await t.run(async (ctx) => {
			const row = await ctx.db.query("audio_tracks").first();
			if (row) {
				await ctx.db.patch("audio_tracks", row._id, {
					key: `support/grounding/${uuid}.m4a`,
				});
			}
		});
		await discard(`support/grounding/${uuid}.m4a`);
		expect(r2.deleteObject).not.toHaveBeenCalled();
		await expect(discard(`thumb/${SHA}.webp`)).rejects.toThrow(
			/isn't an admin audio upload/
		);
		await expect(discard("support/grounding/old.m4a")).rejects.toThrow(
			/isn't an admin audio upload/
		);
	});

	it("sets a hub's 1280 cover over an older one", async () => {
		const t = asAdmin();
		await t.mutation(api.admin.hubs.create, { slug: "sleep", title: "Sleep" });
		expect(
			await t.query(api.admin.hubs.cover, { linkWindow: 0, slug: "sleep" })
		).toBeNull();
		await t.run(async (ctx) => {
			const h = await ctx.db.query("library_hubs").first();
			if (h) {
				await ctx.db.patch("library_hubs", h._id, {
					coverKey: "hub-cover/o.png",
				});
			}
		});
		await t.mutation(api.admin.hubs.replaceCover, {
			slug: "sleep",
			...THUMB,
		});
		expect(
			await t.query(api.admin.hubs.cover, { linkWindow: 0, slug: "sleep" })
		).toBe(`https://r2.test/hub-cover/${SHA}.webp`);
		const [hub] = await t.query(api.admin.hubs.list, {});
		expect(hub.hasCover).toBe(true);
	});
});
