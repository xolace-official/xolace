// @vitest-environment edge-runtime
/**
 * The public Lantern preview (`GET /lantern/preview?slug=`), read by
 * xolaceinc.com for a shared link. What can go wrong: a draft or retired entry
 * previews; the body, audio or a curator-only field leaks; the cover is signed
 * for the app's hour and dies in the website's cache; a malformed slug reaches
 * the db; the response is cacheable by anyone or not at all.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Doc } from "../_generated/dataModel";
import { asUnauthed } from "../test/harness.helpers";
import { aggregatesMock, revenuecatMock } from "../test/mocks.helpers";

const signed: { expiresIn?: number; key: string }[] = [];

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../revenuecat", () => revenuecatMock());
vi.mock("../ai/paths/audioTracks", () => ({
	r2: {
		getUrl: async (key: string, opts?: { expiresIn?: number }) => {
			signed.push({ expiresIn: opts?.expiresIn, key });
			return `https://r2.test/${key}`;
		},
	},
}));
afterEach(() => {
	signed.length = 0;
	vi.restoreAllMocks();
});

type Entry = Omit<Doc<"library_entries">, "_id" | "_creationTime">;

const DAY_SEC = 24 * 60 * 60;

/** A live first-hand story carrying every curator-only field, so a leak shows. */
const story = (slug: string, extra: Partial<Entry> = {}): Entry => ({
	active: true,
	consentRecordedAt: 1,
	contentNote: "Mentions self-harm",
	cover512Key: `library-thumb/${slug}-512.webp`,
	cover1280Key: `library-thumb/${slug}-1280.webp`,
	coverKey: `library-thumb/${slug}.jpg`,
	coverThumbhash: "abc=",
	dek: `Dek ${slug}`,
	editedBy: "user_admin",
	kind: "story",
	lastReviewedAt: 2,
	primarySubject: "grief",
	publishedAt: 3,
	readMin: 6,
	reflectPrompt: "What stayed with you?",
	retrievedAt: 4,
	reuse: "original",
	safetyReviewedAt: 5,
	searchText: "secret search words",
	sha256: "deadbeef",
	slug,
	storyDescriptor: "a second-year student, 20",
	title: `Title ${slug}`,
	updatedAt: 6,
	...extra,
});

async function seed(entries: Entry[]) {
	const t = asUnauthed();
	await t.run(async (ctx) => {
		for (const e of entries) {
			const entryId = await ctx.db.insert("library_entries", e);
			await ctx.db.insert("library_entry_bodies", {
				entryId,
				markdown: "THE PRIVATE BODY",
			});
			await ctx.db.insert("library_entry_audio", {
				active: true,
				durationSec: 300,
				entryId,
				key: "library-audio/full.mp3",
				previewKey: "library-audio/preview.mp3",
				sha256: "audio",
			});
		}
	});
	return t;
}

const get = (t: Awaited<ReturnType<typeof seed>>, query: string) =>
	t.fetch(`/lantern/preview${query}`, { method: "GET" });

describe("GET /lantern/preview", () => {
	it("returns only the public fields of a live entry, cover signed for days", async () => {
		const t = await seed([story("losing-my-dad")]);
		const res = await get(t, "?slug=losing-my-dad");

		expect(res.status).toBe(200);
		expect(res.headers.get("Content-Type")).toBe("application/json");
		expect(res.headers.get("Cache-Control")).toBe(
			"public, max-age=300, s-maxage=3600"
		);
		expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();

		const text = await res.text();
		// The allow-list, exactly: nothing curator-only, no body, no audio.
		expect(JSON.parse(text)).toEqual({
			coverUrl: "https://r2.test/library-thumb/losing-my-dad-1280.webp",
			dek: "Dek losing-my-dad",
			kind: "story",
			readMin: 6,
			slug: "losing-my-dad",
			storyDescriptor: "a second-year student, 20",
			title: "Title losing-my-dad",
		});
		expect(text).not.toContain("PRIVATE BODY");
		expect(text).not.toContain("library-audio");

		expect(signed).toEqual([
			{ expiresIn: 7 * DAY_SEC, key: "library-thumb/losing-my-dad-1280.webp" },
		]);
		expect(signed[0]?.expiresIn).toBeGreaterThanOrEqual(DAY_SEC);
	});

	it("falls back to the original cover, then a hosted URL, then none", async () => {
		const t = await seed([
			story("original", { cover1280Key: undefined }),
			story("hosted", {
				cover1280Key: undefined,
				coverKey: undefined,
				coverUrl: "https://cdn.test/cover.jpg",
			}),
			story("bare", {
				cover1280Key: undefined,
				coverKey: undefined,
				kind: "advice",
				storyDescriptor: undefined,
			}),
		]);

		const original = await (await get(t, "?slug=original")).json();
		expect(original.coverUrl).toBe(
			"https://r2.test/library-thumb/original.jpg"
		);

		const hosted = await (await get(t, "?slug=hosted")).json();
		expect(hosted.coverUrl).toBe("https://cdn.test/cover.jpg");

		const bare = await (await get(t, "?slug=bare")).json();
		expect(bare).not.toHaveProperty("coverUrl");
		expect(bare).not.toHaveProperty("storyDescriptor");
		expect(bare.kind).toBe("advice");
	});

	it("is a 404 for a draft, a retired or an unknown slug", async () => {
		const t = await seed([
			story("draft", { active: false, publishedAt: undefined }),
			story("retired", { active: false, retiredAt: 9 }),
		]);

		for (const slug of ["draft", "retired", "never-existed"]) {
			const res = await get(t, `?slug=${slug}`);
			expect(res.status).toBe(404);
			expect(await res.json()).toEqual({ error: "not_found" });
		}
		expect(signed).toEqual([]);
	});

	it("is a 400 for a missing or malformed slug, and caches neither", async () => {
		const t = await seed([story("ok")]);

		for (const query of [
			"",
			"?slug=",
			"?slug=Has-Caps",
			"?slug=../etc",
			"?slug=a%20b",
			`?slug=${"a".repeat(129)}`,
		]) {
			const res = await get(t, query);
			expect(res.status).toBe(400);
			expect(await res.json()).toEqual({ error: "invalid_slug" });
			expect(res.headers.get("Cache-Control")).toBeNull();
		}
	});
});
