// @vitest-environment edge-runtime
/**
 * Admin imports (admin v1 step 6c): the compare keeps the ingest's gates and
 * diffs field by field, apply runs one workflow per item in phase order, and
 * an item whose row moved on since the compare fails instead of overwriting.
 */
import type { WorkflowId } from "@convex-dev/workflow";
import type { FunctionArgs } from "convex/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { r2 } from "../ai/paths/audioTracks";
import { type ItemSteps, runItem, workflow } from "../imports/apply";
import { asAdmin, asUnauthed } from "../test/harness.helpers";

const SHA = (c: string) => c.repeat(64);
const THUMBHASH = "1QcSHQRnh493V4dIh4eXh1h4kJUI";

const uploaded = new Map<string, number>();

// The workflow component's own modules don't load under this repo's Vite, so
// `workflow.start` only records the item; `settle` then runs the real steps
// (`runItem`) and the real `finished` handler, as the component would.
const started: { itemId: Id<"import_items">; workflowId: WorkflowId }[] = [];

beforeEach(() => {
	vi.useFakeTimers();
	uploaded.clear();
	started.length = 0;
	vi.spyOn(workflow, "start").mockImplementation(async (_ctx, _fn, args) => {
		const workflowId = `wf${started.length}` as WorkflowId;
		started.push({ itemId: args.itemId, workflowId });
		return await Promise.resolve(workflowId);
	});
	vi.spyOn(workflow, "cleanup").mockResolvedValue(true);
	vi.spyOn(r2, "getUrl").mockImplementation(
		async (key) => `https://r2.test/${key}`
	);
	vi.spyOn(r2, "generateUploadUrl").mockImplementation(async (key) => ({
		key: key ?? "random",
		url: `https://r2.test/put/${key}`,
	}));
	vi.spyOn(r2, "deleteObject").mockResolvedValue(undefined);
	// R2 "has" whatever a test marks uploaded, at the size it was PUT.
	vi.spyOn(r2, "syncMetadata").mockImplementation(async (_ctx, key) => {
		if (!uploaded.has(key)) {
			throw new Error("NotFound");
		}
	});
	vi.spyOn(r2, "getMetadata").mockImplementation(async (_ctx, key) => {
		const size = uploaded.get(key);
		return size === undefined
			? null
			: {
					bucket: "b",
					bucketLink: "",
					key,
					lastModified: "",
					link: "",
					size,
					url: "",
				};
	});
});
afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

type Records = FunctionArgs<typeof api.admin.imports.compare>["records"];

function setup() {
	const root = asUnauthed();
	return { other: asAdmin(2, root), root, t: asAdmin(1, root) };
}

type Admin = ReturnType<typeof setup>["t"];

const nhs = {
	attributionText: "Contains public sector information (OGL v3.0)",
	dropBrandingIfAdapted: true,
	licence: "OGL v3.0",
	name: "NHS",
	permission: "not_required" as const,
	slug: "nhs",
};

/** The source's terms as the Sources editor sends them: everything but its slug. */
const { slug: _nhsSlug, ...terms } = nhs;

type EntryArg = typeof internal.library.ingest.upsertEntry._args.entry;

const baseEntry = (slug: string): EntryArg => ({
	active: true,
	dek: `Dek ${slug}`,
	facets: { emotion: ["anxiety"] },
	kind: "advice",
	lastReviewedAt: 1_780_000_000_000,
	primarySubject: "anxiety",
	reuse: "adapted",
	slug,
	sources: [{ pageTitle: "Panic", source: "nhs" }],
	title: `Title ${slug}`,
});

/** An entry as a dropped manifest holds it; the compare validates it, so tests can break it. */
const entryRecord = (slug: string, extra: Record<string, unknown> = {}) => ({
	...baseEntry(slug),
	bodyPath: `bodies/${slug}.md`,
	...extra,
});

/** Ingest an entry the way the script does, so it's stored with no `editedBy`. */
async function ingestEntry(
	t: Admin,
	slug: string,
	markdown: string,
	extra: Partial<EntryArg> = {}
) {
	await t.mutation(internal.library.ingest.upsertEntry, {
		entry: { ...baseEntry(slug), ...extra },
		markdown,
		sha256: `seed-${slug}`,
	});
}

async function compare(
	t: Admin,
	target: "library" | "audio",
	records: Records
) {
	return await t.mutation(api.admin.imports.compare, {
		files: `${records.length} records`,
		records,
		target,
	});
}

async function run(t: Admin, number: number) {
	const r = await t.query(api.admin.imports.get, { number });
	if (!r) {
		throw new Error(`no run ${number}`);
	}
	return r;
}

const item = (r: Awaited<ReturnType<typeof run>>, slug: string) => {
	const found = r.items.find((i) => i.slug === slug);
	if (!found) {
		throw new Error(`no item ${slug}`);
	}
	return found;
};

/** Runs every started item workflow to the end, including ones a finish starts. */
async function settle(root: ReturnType<typeof setup>["root"]) {
	// convex-test types each call by its concrete reference; the steps' are generic.
	const run = root as unknown as Record<
		"action" | "mutation",
		(fn: unknown, args: unknown) => Promise<never>
	>;
	const steps: ItemSteps = {
		runAction: (action, args) => run.action(action, args),
		runMutation: (mutation, args) => run.mutation(mutation, args),
	};
	for (let next = started.shift(); next; next = started.shift()) {
		const { itemId, workflowId } = next;
		let result:
			| { kind: "success"; returnValue: unknown }
			| { error: string; kind: "failed" };
		try {
			result = { kind: "success", returnValue: await runItem(steps, itemId) };
		} catch (error) {
			result = { error: String(error), kind: "failed" };
		}
		await root.mutation(internal.imports.apply.finished, {
			context: { itemId },
			result,
			workflowId,
		});
	}
}

describe("admin/imports compare", () => {
	it("diffs a library drop and rejects what the ingest would", async () => {
		const { t } = setup();
		await t.mutation(internal.library.ingest.upsertSource, {
			sha256: "seed",
			source: nhs,
		});
		await ingestEntry(t, "stored", "Old body");

		const { number, uploads } = await compare(t, "library", [
			{ record: { ...nhs, refreshDays: 7 }, role: "sources" },
			{
				record: {
					...nhs,
					name: "Mind",
					slug: "mind",
				},
				role: "sources",
			},
			{
				body: "New body",
				record: entryRecord("stored", { dek: "A sharper dek" }),
				role: "entries",
			},
			{
				body: "Fresh",
				record: entryRecord("fresh", {
					sources: [{ pageTitle: "Mind page", source: "mind" }],
				}),
				role: "entries",
			},
			{
				body: "A story",
				record: entryRecord("no-consent", {
					kind: "story",
					reuse: "original",
					sources: [],
				}),
				role: "entries",
			},
			{
				body: "![](chart.png)",
				record: entryRecord("no-alt"),
				role: "entries",
			},
			{
				body: "x",
				record: entryRecord("ghost-credit", {
					sources: [{ pageTitle: "?", source: "hesa" }],
				}),
				role: "entries",
			},
			{
				record: entryRecord("no-body"),
				role: "entries",
			},
			{
				body: "x",
				record: { ...entryRecord("bad-kind"), kind: "poem" },
				role: "entries",
			},
			{
				record: {
					active: true,
					intro: "Start here",
					items: [{ kind: "entry", ref: "fresh" }],
					slug: "hub",
					title: "Hub",
				},
				role: "hubs",
			},
			{
				record: {
					active: true,
					audioPath: "a.mp3",
					entrySlug: "stored",
					transcriptPath: "a.txt",
				},
				role: "narration",
			},
			{ record: { ...nhs, name: "Mind", slug: "mind" }, role: "sources" },
		]);
		expect(uploads).toEqual([]);

		const r = await run(t, number);
		expect(r.state).toBe("review");
		expect(r.counts).toEqual({ changed: 2, new: 3, rejected: 7, unchanged: 0 });

		expect(item(r, "nhs").changes).toEqual([
			{ after: "7 days", field: "Refresh every" },
		]);
		expect(item(r, "stored").changes?.map((c) => c.field)).toEqual([
			"Dek",
			"Body",
		]);
		expect(item(r, "stored").changes?.at(-1)).toMatchObject({
			after: "New body",
			before: "Old body",
			long: true,
		});
		// The entry credits a source that's new in the same drop, and the hub holds that entry.
		expect(item(r, "fresh").action).toBe("new");
		expect(item(r, "hub").action).toBe("new");

		const rejection = (slug: string) =>
			r.items.find((i) => i.slug === slug && i.action === "rejected")
				?.rejection;
		expect(rejection("no-consent")).toMatch(/consentRecordedAt/);
		expect(rejection("no-alt")).toMatch(/chart\.png.*alt text/);
		expect(rejection("ghost-credit")).toMatch(/unknown source "hesa"/);
		expect(rejection("no-body")).toMatch(
			/bodies\/no-body\.md isn't in the drop/
		);
		expect(rejection("bad-kind")).toBe(
			'"kind" should be explainer, advice or story, not "poem"'
		);
		expect(rejection("stored")).toMatch(/narration still goes through/i);
		expect(rejection("mind")).toMatch(/in the drop twice/);

		// Compare writes nothing but the run.
		const sources = await t.query(api.admin.sources.list, {});
		expect(sources.map((s) => s.slug)).toEqual(["nhs"]);
	});

	it("warns about, and leaves out, a changed item last edited in the admin", async () => {
		const { t } = setup();
		await t.mutation(api.admin.sources.create, { slug: "nhs", source: terms });
		const { number } = await compare(t, "library", [
			{ record: { ...nhs, licence: "OGL v2.0" }, role: "sources" },
		]);
		const nhsItem = item(await run(t, number), "nhs");
		expect(nhsItem.action).toBe("changed");
		expect(nhsItem.skipped).toBe(true);
		expect(nhsItem.warnings?.[0]).toMatch(/Last edited in the admin/);
	});

	it("rejects a live explainer whose body change would clear its review", async () => {
		const { t } = setup();
		await t.mutation(internal.library.ingest.upsertSource, {
			sha256: "seed",
			source: nhs,
		});
		await ingestEntry(t, "panic", "Body one", {
			active: false,
			kind: "explainer",
		});
		await t.mutation(internal.library.admin.markSafetyReviewed, {
			slug: "panic",
		});
		const { number } = await compare(t, "library", [
			{
				body: "Body two",
				record: entryRecord("panic", { kind: "explainer" }),
				role: "entries",
			},
			{
				body: "Body two",
				record: entryRecord("panic-draft", {
					active: false,
					kind: "explainer",
				}),
				role: "entries",
			},
		]);
		const r = await run(t, number);
		expect(item(r, "panic").rejection).toMatch(/clears the safety review/);
		expect(item(r, "panic-draft").warnings).toEqual([
			expect.stringMatching(/Needs review/),
		]);
	});
});

describe("admin/imports covers", () => {
	const cover = (sha512: string, sha1280: string) => ({
		bytes: 3000,
		name: "cover.png",
		thumbhash: THUMBHASH,
		webp: [
			{ bytes: 51, px: 512, sha256: sha512 },
			{ bytes: 128, px: 1280, sha256: sha1280 },
		],
	});

	it("uploads each cover size once, and keeps a stored cover the drop leaves out", async () => {
		const { root, t } = setup();
		await t.mutation(internal.library.ingest.upsertSource, {
			sha256: "seed",
			source: nhs,
		});
		const first = await compare(t, "library", [
			{
				body: "A",
				image: cover(SHA("1"), SHA("2")),
				record: entryRecord("a", { coverPath: "cover.png" }),
				role: "entries",
			},
			{
				body: "B",
				image: cover(SHA("1"), SHA("2")),
				record: entryRecord("b", { coverPath: "cover.png" }),
				role: "entries",
			},
			{
				image: {
					bytes: 3000,
					name: "hub.png",
					thumbhash: THUMBHASH,
					webp: [{ bytes: 128, px: 1280, sha256: SHA("3") }],
				},
				record: {
					active: false,
					coverPath: "hub.png",
					intro: "",
					items: [],
					slug: "hub",
					title: "Hub",
				},
				role: "hubs",
			},
		]);
		expect(
			first.uploads.map((u) => u.url.replace("https://r2.test/put/", ""))
		).toEqual([
			`library-thumb/${SHA("1")}.webp`,
			`library-thumb/${SHA("2")}.webp`,
			`hub-cover/${SHA("3")}.webp`,
		]);
		for (const [key, bytes] of [
			[`library-thumb/${SHA("1")}.webp`, 51],
			[`library-thumb/${SHA("2")}.webp`, 128],
			[`hub-cover/${SHA("3")}.webp`, 128],
		] as const) {
			uploaded.set(key, bytes);
		}
		await t.mutation(api.admin.imports.uploaded, { number: first.number });
		await t.mutation(api.admin.imports.apply, { number: first.number });
		await settle(root);
		expect((await run(t, first.number)).failed).toBe(0);

		// A copy edit without the image: the stored cover stays, nothing uploads.
		const second = await compare(t, "library", [
			{
				body: "A",
				record: entryRecord("a", { coverPath: "cover.png", dek: "New dek" }),
				role: "entries",
			},
		]);
		expect(second.uploads).toEqual([]);
		expect(
			item(await run(t, second.number), "a").changes?.map((c) => c.field)
		).toEqual(["Dek"]);
	});
});

describe("admin/imports apply", () => {
	it("applies in phase order and settles each item", async () => {
		const { root, t } = setup();
		const { number } = await compare(t, "library", [
			{
				record: {
					active: true,
					intro: "Start here",
					items: [
						{ kind: "entry", ref: "fresh" },
						{ kind: "entry", ref: "explained" },
					],
					slug: "hub",
					title: "Hub",
				},
				role: "hubs",
			},
			{ body: "Fresh", record: entryRecord("fresh"), role: "entries" },
			{
				body: "Explained",
				record: entryRecord("explained", { active: false, kind: "explainer" }),
				role: "entries",
			},
			{ record: nhs, role: "sources" },
		]);
		await t.mutation(api.admin.imports.apply, { number });
		await settle(root);

		const r = await run(t, number);
		expect(r.state).toBe("done");
		expect(r.failed).toBe(0);
		expect(Object.fromEntries(r.items.map((i) => [i.slug, i.status]))).toEqual({
			explained: "needs_review",
			fresh: "live",
			hub: "live",
			nhs: "live",
		});
		const hubs = await t.query(api.admin.hubs.list, {});
		expect(hubs[0]?.items.map((i) => i.ref)).toEqual(["fresh", "explained"]);
		// Written the way the script writes: no admin stamp.
		const entries = await t.query(api.admin.library.list, {});
		expect(entries.every((e) => e.editedBy === undefined)).toBe(true);
	});

	it("fails an item whose row changed after compare, and keeps failing it on retry", async () => {
		const { root, t, other } = setup();
		await t.mutation(api.admin.sources.create, { slug: "nhs", source: terms });
		const { number } = await compare(t, "library", [
			{ record: { ...nhs, licence: "OGL v2.0" }, role: "sources" },
		]);
		const { id } = item(await run(t, number), "nhs");
		await t.mutation(api.admin.imports.setSkipped, {
			itemIds: [id],
			number,
			skipped: false,
		});
		// Someone edits the source while the import sits in review.
		await other.mutation(api.admin.sources.save, {
			slug: "nhs",
			source: { ...terms, name: "NHS England" },
		});
		await t.mutation(api.admin.imports.apply, { number });
		await settle(root);

		let r = await run(t, number);
		expect(item(r, "nhs")).toMatchObject({
			failure: {
				message: expect.stringMatching(
					/Changed after this import was compared/
				),
				step: "Upsert source",
			},
			status: "failed",
		});
		expect(r).toMatchObject({ failed: 1, state: "done" });

		await t.mutation(api.admin.imports.retry, { itemId: id, number });
		await settle(root);
		r = await run(t, number);
		expect(item(r, "nhs")).toMatchObject({ attempt: 2, status: "failed" });
		const [stored] = await t.query(api.admin.sources.list, {});
		expect(stored).toMatchObject({ licence: "OGL v3.0", name: "NHS England" });
	});
});

const track = (slug: string, extra: Record<string, unknown> = {}) => ({
	audioPath: `${slug}.mp3`,
	family: "support",
	narrators: ["Sage"],
	slug,
	sourceTags: [],
	tags: ["calm"],
	thumbPath: `${slug}.png`,
	tier: 1,
	title: `Track ${slug}`,
	topic: "audio_topic_grief",
	...extra,
});

const audioFile = (sha: string) => ({
	bytes: 1000,
	durationSec: 97,
	ext: "mp3" as const,
	name: "a.mp3",
	sha256: sha,
});
const thumbFile = (sha: string) => ({
	bytes: 2000,
	name: "a.png",
	thumbhash: THUMBHASH,
	webp: [{ bytes: 200, px: 1080, sha256: sha }],
});

describe("admin/imports audio", () => {
	it("stages a new track's files, checks they arrived, then makes it live", async () => {
		const { root, t } = setup();
		const { number, uploads } = await compare(t, "audio", [
			{
				audio: audioFile(SHA("a")),
				image: thumbFile(SHA("b")),
				record: track("calm-one"),
				role: "tracks",
			},
		]);
		expect(uploads.map((u) => u.part)).toEqual(["audio", 1080]);
		expect((await run(t, number)).state).toBe("uploading");
		await expect(
			t.mutation(api.admin.imports.apply, { number })
		).rejects.toThrow(/uploading/);

		// The browser PUTs the thumbnail but its audio never lands.
		uploaded.set(`thumb/${SHA("b")}.webp`, 200);
		await t.mutation(api.admin.imports.uploaded, { number });
		await t.mutation(api.admin.imports.apply, { number });
		await settle(root);
		let r = await run(t, number);
		expect(item(r, "calm-one")).toMatchObject({
			failure: {
				message: expect.stringMatching(/never finished uploading/),
				step: "Check uploads",
			},
			status: "failed",
		});

		// It arrives; Retry runs the item again.
		const audioKey = uploads[0]?.url.replace("https://r2.test/put/", "") ?? "";
		expect(audioKey).toMatch(/^support\/calm-one\/[0-9a-f-]{36}\.mp3$/);
		uploaded.set(audioKey, 1000);
		await t.mutation(api.admin.imports.retry, {
			itemId: item(r, "calm-one").id,
			number,
		});
		await settle(root);
		r = await run(t, number);
		expect(r).toMatchObject({ failed: 0, state: "done" });
		expect(item(r, "calm-one")).toMatchObject({ attempt: 2, status: "live" });
		const [row] = await t.query(api.admin.audio.list, {});
		expect(row).toMatchObject({
			active: true,
			durationSec: 97,
			slug: "calm-one",
		});
	});

	it("keeps the stored audio for a metadata-only change, and never deletes it", async () => {
		const { root, t } = setup();
		await t.mutation(internal.ai.paths.audioTracks.upsertTrack, {
			track: {
				durationSec: 60,
				family: "support",
				key: "support/calm/live.mp3",
				narrators: ["Sage"],
				sha256: SHA("a"),
				slug: "calm",
				sourceTags: [],
				tags: ["calm"],
				thumbhash: THUMBHASH,
				thumbKey: `thumb/${SHA("b")}.webp`,
				thumbSha256: SHA("b"),
				tier: 1,
				title: "Calm",
				topic: "audio_topic_grief",
			},
		});
		const { number, uploads } = await compare(t, "audio", [
			{
				record: track("calm", { sha256: SHA("a"), title: "Calm, again" }),
				role: "tracks",
			},
		]);
		expect(uploads).toEqual([]);
		const calm = item(await run(t, number), "calm");
		expect(calm.changes).toEqual([
			{ after: "Calm, again", before: "Calm", field: "Title" },
		]);

		vi.mocked(r2.deleteObject).mockClear();
		await t.mutation(api.admin.imports.apply, { number });
		await settle(root);
		expect(item(await run(t, number), "calm").status).toBe("live");
		const [row] = await t.query(api.admin.audio.list, {});
		expect(row?.title).toBe("Calm, again");
		expect(r2.deleteObject).not.toHaveBeenCalledWith(
			expect.anything(),
			"support/calm/live.mp3"
		);
	});

	it("keeps a stored thumbnail made from the dropped source, and the stored length", async () => {
		const { t } = setup();
		await t.mutation(internal.ai.paths.audioTracks.upsertTrack, {
			track: {
				durationSec: 96,
				family: "support",
				key: "support/calm/live.mp3",
				narrators: ["Sage"],
				sha256: SHA("a"),
				slug: "calm",
				sourceTags: [],
				tags: ["calm"],
				thumbhash: THUMBHASH,
				thumbKey: `thumb/${SHA("b")}.webp`,
				thumbSha256: SHA("b"),
				tier: 1,
				title: "Calm",
				topic: "audio_topic_grief",
			},
		});
		// The script noted that its WebP (b) came from source c.
		await t.mutation(internal.imports.imageSources.note, {
			pairs: [{ sourceSha256: SHA("c"), webpSha256: SHA("b") }],
		});
		const drop = (source: string) => [
			{
				// The browser reads the same audio as 97s, and encodes c as WebP d.
				audio: audioFile(SHA("a")),
				image: { ...thumbFile(SHA("d")), sourceSha256: source },
				record: track("calm", { title: "Calm" }),
				role: "tracks" as const,
			},
		];

		const same = await compare(t, "audio", drop(SHA("c")));
		expect(same.uploads).toEqual([]);
		expect(item(await run(t, same.number), "calm").action).toBe("unchanged");

		// Another source is a new thumbnail, at the browser's key.
		const other = await compare(t, "audio", drop(SHA("e")));
		expect(other.uploads.map((u) => u.part)).toEqual([1080]);
		expect(
			item(await run(t, other.number), "calm").changes?.map((c) => c.field)
		).toEqual(["Thumbnail"]);
	});

	it("rejects a changed track whose audio hash moved without its file", async () => {
		const { t } = setup();
		await t.mutation(internal.ai.paths.audioTracks.upsertTrack, {
			track: {
				durationSec: 60,
				family: "support",
				key: "support/calm/live.mp3",
				sha256: SHA("a"),
				slug: "calm",
				sourceTags: [],
				tags: [],
				thumbKey: `thumb/${SHA("b")}.webp`,
				thumbSha256: SHA("b"),
				title: "Calm",
				topic: "audio_topic_grief",
			},
		});
		const { number } = await compare(t, "audio", [
			{ record: track("calm", { sha256: SHA("c") }), role: "tracks" },
			{ record: track("new-no-files"), role: "tracks" },
			{
				audio: audioFile(SHA("d")),
				image: thumbFile(SHA("e")),
				record: track("acute", { tier: 3 }),
				role: "tracks",
			},
			{ record: { slug: "not_a_topic", thumbPath: "x.png" }, role: "topics" },
			{ record: track("wrong-target"), role: "entries" },
		]);
		const r = await run(t, number);
		expect(item(r, "calm").rejection).toMatch(/audio changed/);
		expect(item(r, "new-no-files").rejection).toMatch(
			/new-no-files\.mp3 isn't in the drop/
		);
		expect(item(r, "acute").rejection).toMatch(/tier 3 needs a safety review/);
		expect(item(r, "not_a_topic").rejection).toMatch(
			/isn't a catalogued topic/
		);
		expect(item(r, "wrong-target").rejection).toMatch(
			/isn't part of a audio import|entry/
		);
	});

	it("drops staged audio on discard and for items left out", async () => {
		const { root, t } = setup();
		const first = await compare(t, "audio", [
			{
				audio: audioFile(SHA("a")),
				image: thumbFile(SHA("b")),
				record: track("one"),
				role: "tracks",
			},
		]);
		await t.mutation(api.admin.imports.discard, { number: first.number });
		expect(r2.deleteObject).toHaveBeenCalledWith(
			expect.anything(),
			expect.stringMatching(/^support\/one\//)
		);
		expect((await run(t, first.number)).state).toBe("discarded");

		vi.mocked(r2.deleteObject).mockClear();
		const second = await compare(t, "audio", [
			{
				audio: audioFile(SHA("c")),
				image: thumbFile(SHA("d")),
				record: track("two"),
				role: "tracks",
			},
		]);
		await t.mutation(api.admin.imports.uploaded, { number: second.number });
		const two = item(await run(t, second.number), "two");
		await t.mutation(api.admin.imports.setSkipped, {
			itemIds: [two.id],
			number: second.number,
			skipped: true,
		});
		await t.mutation(api.admin.imports.apply, { number: second.number });
		await settle(root);
		expect(r2.deleteObject).toHaveBeenCalledWith(
			expect.anything(),
			expect.stringMatching(/^support\/two\//)
		);
		expect((await run(t, second.number)).state).toBe("done");
		expect(await t.query(api.admin.audio.list, {})).toEqual([]);
	});

	it("numbers runs and lists them newest first", async () => {
		const { t } = setup();
		await compare(t, "library", [{ record: nhs, role: "sources" }]);
		await compare(t, "library", [{ record: nhs, role: "sources" }]);
		const runs = await t.query(api.admin.imports.list, {});
		expect(runs.map((r) => r.number)).toEqual([2, 1]);
		expect(runs[0]).toMatchObject({
			counts: { changed: 0, new: 1, rejected: 0, unchanged: 0 },
			state: "review",
		});
	});
});
