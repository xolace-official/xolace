// @vitest-environment edge-runtime
/**
 * The flat `browse.ts` paths shipped builds still call answer exactly what
 * the `browse/` paths do, for the same catalogue and the same args, and
 * refuse a signed-out caller the same way.
 */
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import {
	asNewUser,
	asUnauthed,
	type SeededUser,
} from "../test/harness.helpers";
import { aggregatesMock } from "../test/mocks.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../ai/paths/audioTracks", () => ({
	r2: { getUrl: async (key: string) => `https://r2.test/${key}` },
}));
afterEach(() => vi.restoreAllMocks());

type Track = Omit<Doc<"audio_tracks">, "_id" | "_creationTime">;
type FamilyPageArgs = FunctionArgs<typeof api.browse.family.listByFamily>;
type FamilyPage = FunctionReturnType<typeof api.browse.family.listByFamily>;

/** Far enough ahead that `Date.now()` between two calls can't cross it. */
const FAR_FUTURE = Date.UTC(2100, 0, 1);
const DAY = 20_400;
const HOUR = DAY * 24 + 5;

const track = (
	slug: string,
	family: Track["family"],
	topic: string,
	extra: Partial<Track> = {}
): Track => ({
	active: true,
	durationSec: 60,
	family,
	key: `${family}/${slug}.m4a`,
	sha256: slug,
	slug,
	sourceTags: [],
	tags: [],
	thumbhash: `hash-${slug}`,
	thumbKey: `thumb/${slug}.webp`,
	thumbSha256: slug,
	title: slug,
	topic,
	...(family === "music"
		? {
				licence: {
					acquiredAt: 0,
					artist: "Artist",
					attributionRequired: true,
					attributionText: "Music by Artist",
					licenceName: "Pixabay",
					licenceUrl: "https://pixabay.com/service/license-summary/",
					source: "Pixabay",
					sourceUrl: "https://pixabay.com",
				},
			}
		: { narrators: ["Sage"] }),
	...extra,
});

/** Both families, a series, a retired row, a secondary topic, a curated topic and fresh tracks. */
async function seedCatalogue(user: SeededUser) {
	await user.root.run(async (ctx) => {
		for (const t of [
			track("ep1", "support", "audio_topic_sleep", {
				episodeNumber: 1,
				newUntil: FAR_FUTURE,
				series: "wind-down",
				seriesTitle: "Wind down",
			}),
			track("s1", "support", "audio_topic_sleep"),
			track("s2", "support", "audio_topic_sleep", { active: false }),
			track("s3", "support", "audio_topic_grief", { newUntil: FAR_FUTURE }),
			track("s4", "support", "audio_topic_self_worth"),
			track("m1", "music", "music_topic_sleep", { featured: true }),
			track("m2", "music", "music_topic_calm_peace", {
				secondaryTopic: "music_topic_sleep",
			}),
			track("m3", "music", "music_topic_calm_peace", { active: false }),
		]) {
			await ctx.db.insert("audio_tracks", t);
		}
		await ctx.db.insert("topics", {
			slug: "sleep",
			thumbhash: "hash-sleep-cover",
			thumbKey: "thumb/sleep-cover.webp",
			thumbSha256: "sleep-cover",
			title: "Sleep & rest",
		});
	});
}

describe("the old browse paths", () => {
	it("answer the shelf and the hero as browse/hub does", async () => {
		const user = await asNewUser();
		await seedCatalogue(user);

		for (const args of [{}, { day: DAY }, { day: DAY, hour: HOUR }]) {
			const old = await user.t.query(api.browse.getNewShelf, args);
			expect(old.length).toBeGreaterThan(0);
			expect(await user.t.query(api.browse.hub.getNewShelf, args)).toEqual(old);
		}

		const featured = await user.t.query(api.browse.getFeatured, {});
		expect(featured?.slug).toBe("m1");
		expect(await user.t.query(api.browse.hub.getFeatured, {})).toEqual(
			featured
		);
	});

	it("answer the hero's fallback and an empty catalogue the same", async () => {
		const user = await asNewUser();
		expect(await user.t.query(api.browse.getFeatured, {})).toBeNull();
		expect(await user.t.query(api.browse.hub.getFeatured, {})).toBeNull();
		expect(await user.t.query(api.browse.getNewShelf, {})).toEqual([]);
		expect(await user.t.query(api.browse.hub.getNewShelf, {})).toEqual([]);
	});

	it("answer a family's pages as browse/family does", async () => {
		const user = await asNewUser();
		await seedCatalogue(user);

		for (const family of ["support", "music"] as const) {
			let cursor: string | null = null;
			let isDone = false;
			while (!isDone) {
				const args: FamilyPageArgs = {
					family,
					paginationOpts: { cursor, numItems: 2 },
				};
				const old: FamilyPage = await user.t.query(
					api.browse.listByFamily,
					args
				);
				const next = await user.t.query(api.browse.family.listByFamily, args);
				expect(next).toEqual(old);
				cursor = old.continueCursor;
				isDone = old.isDone;
			}
		}
	});

	it("answer the topic reads as browse/topics does", async () => {
		const user = await asNewUser();
		await seedCatalogue(user);

		const tiles = await user.t.query(api.browse.getTopics, {});
		expect(tiles.map((t) => t.slug)).toEqual([
			"calm_peace",
			"grief",
			"self_worth",
			"sleep",
		]);
		expect(await user.t.query(api.browse.topics.getTopics, {})).toEqual(tiles);

		for (const slug of [
			"sleep",
			"calm_peace",
			"grief",
			"self_worth",
			"unknown",
		]) {
			const rows = await user.t.query(api.browse.getTopic, { slug });
			expect(await user.t.query(api.browse.topics.getTopic, { slug })).toEqual(
				rows
			);
			const title = await user.t.query(api.browse.getTopicTitle, { slug });
			expect(
				await user.t.query(api.browse.topics.getTopicTitle, { slug })
			).toBe(title);
		}
		expect(
			await user.t.query(api.browse.getTopicTitle, { slug: "sleep" })
		).toBe("Sleep & rest");
		expect(
			(await user.t.query(api.browse.getTopic, { slug: "sleep" })).map(
				(r) => r.slug
			)
		).toEqual(["ep1", "s1", "m1", "m2"]);
	});

	it("refuse a signed-out caller at both paths", async () => {
		const t = asUnauthed();
		const slug = { slug: "sleep" };
		const page = {
			family: "support" as const,
			paginationOpts: { cursor: null, numItems: 2 },
		};
		for (const call of [
			() => t.query(api.browse.getNewShelf, {}),
			() => t.query(api.browse.hub.getNewShelf, {}),
			() => t.query(api.browse.getFeatured, {}),
			() => t.query(api.browse.hub.getFeatured, {}),
			() => t.query(api.browse.listByFamily, page),
			() => t.query(api.browse.family.listByFamily, page),
			() => t.query(api.browse.getTopics, {}),
			() => t.query(api.browse.topics.getTopics, {}),
			() => t.query(api.browse.getTopic, slug),
			() => t.query(api.browse.topics.getTopic, slug),
			() => t.query(api.browse.getTopicTitle, slug),
			() => t.query(api.browse.topics.getTopicTitle, slug),
		]) {
			await expect(call()).rejects.toThrow(/not_authenticated/);
		}
	});
});
