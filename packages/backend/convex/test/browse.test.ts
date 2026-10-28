// @vitest-environment edge-runtime
/**
 * Browse catalogue reads (#339, docs/paths-v1.md §9.3): the per-family
 * paginated list, the topic grid, and the single-topic screen. R2 URL
 * minting is faked at the `r2` seam.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { asNewUser, type SeededUser } from "./harness.helpers";
import { aggregatesMock } from "./mocks.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../ai/paths/audioTracks", () => ({
	r2: { getUrl: async (key: string) => `https://r2.test/${key}` },
}));
afterEach(() => vi.restoreAllMocks());

type Track = Omit<Doc<"audio_tracks">, "_id" | "_creationTime">;

const base = (
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

async function seed(user: SeededUser, tracks: Track[]) {
	await user.root.run(async (ctx) => {
		for (const t of tracks) {
			await ctx.db.insert("audio_tracks", t);
		}
	});
}

describe("browse.listByFamily", () => {
	it("pages one family's active tracks and skips retired rows", async () => {
		const user = await asNewUser();
		await seed(user, [
			base("s1", "support", "audio_topic_anxiety"),
			base("s2", "support", "audio_topic_grief", { active: false }),
			base("s3", "support", "audio_topic_grief"),
			base("m1", "music", "music_topic_calm_peace"),
		]);

		const first = await user.t.query(api.browse.listByFamily, {
			family: "support",
			paginationOpts: { cursor: null, numItems: 1 },
		});
		expect(first.page.map((t) => t.slug)).toEqual(["s1"]);
		expect(first.page[0].thumbUrl).toBe("https://r2.test/thumb/s1.webp");
		expect(first.page[0].attribution).toBe("Sage");
		expect(first.isDone).toBe(false);

		const second = await user.t.query(api.browse.listByFamily, {
			family: "support",
			paginationOpts: { cursor: first.continueCursor, numItems: 5 },
		});
		expect(second.page.map((t) => t.slug)).toEqual(["s3"]);
		expect(second.isDone).toBe(true);
	});
});

describe("browse.getTopics", () => {
	it("lists one tile per shared topic with ≥ 1 active track in either family", async () => {
		const user = await asNewUser();
		await seed(user, [
			base("s1", "support", "audio_topic_sadness"),
			base("m1", "music", "music_topic_sadness"),
			base("m2", "music", "music_topic_sadness"),
			base("m3", "music", "music_topic_calm_peace"),
			base("s2", "support", "audio_topic_grief", { active: false }),
		]);

		const topics = await user.t.query(api.browse.getTopics, {});
		expect(topics.map((t) => [t.slug, t.supportCount, t.musicCount])).toEqual([
			["calm_peace", 0, 1],
			["sadness", 1, 2],
		]);
		expect(topics[0].title).toBe("Calm peace");
		expect(topics[1].thumbUrl).toBe("https://r2.test/thumb/s1.webp");
	});

	it("uses a topic row's cover and title when present, first-track fallback otherwise (#353)", async () => {
		const user = await asNewUser();
		await seed(user, [
			base("s1", "support", "audio_topic_sadness"),
			base("m3", "music", "music_topic_calm_peace"),
			base("s5", "support", "audio_topic_anxiety"),
			base("s9", "support", "audio_topic_grief", { active: false }),
		]);
		await user.root.run(async (ctx) => {
			await ctx.db.insert("topics", {
				slug: "sadness",
				thumbKey: "thumb/sad.webp",
				thumbSha256: "sad",
				title: "Feeling low",
			});
			await ctx.db.insert("topics", {
				slug: "calm_peace",
				thumbKey: "thumb/calm.webp",
				thumbSha256: "calm",
			});
			await ctx.db.insert("topics", {
				slug: "grief",
				thumbKey: "thumb/grief.webp",
				thumbSha256: "grief",
			});
		});

		const topics = await user.t.query(api.browse.getTopics, {});
		expect(topics.map((t) => [t.slug, t.title, t.thumbUrl])).toEqual([
			["anxiety", "Anxiety", "https://r2.test/thumb/s5.webp"],
			["calm_peace", "Calm peace", "https://r2.test/thumb/calm.webp"],
			["sadness", "Feeling low", "https://r2.test/thumb/sad.webp"],
		]);
	});
});

describe("browse.getTopic", () => {
	it("returns both families' active tracks for one topic, episodes carrying series fields", async () => {
		const user = await asNewUser();
		await seed(user, [
			base("ep2", "support", "audio_topic_sadness", {
				episodeNumber: 2,
				series: "the-spectrum",
				seriesTitle: "The Spectrum",
			}),
			base("ep1", "support", "audio_topic_sadness", {
				episodeNumber: 1,
				series: "the-spectrum",
				seriesTitle: "The Spectrum",
			}),
			base("m1", "music", "music_topic_sadness"),
			base("m2", "music", "music_topic_sadness", { active: false }),
			base("m3", "music", "music_topic_calm_peace"),
		]);

		const tracks = await user.t.query(api.browse.getTopic, { slug: "sadness" });
		expect(
			tracks.map((t) => [t.slug, t.family, t.series, t.episodeNumber])
		).toEqual([
			["ep2", "support", "the-spectrum", 2],
			["ep1", "support", "the-spectrum", 1],
			["m1", "music", undefined, undefined],
		]);
		expect(tracks[2].attribution).toBe("Music by Artist");
	});
});

describe("secondary topics", () => {
	it("list a music track under its secondary topic after the topic's own, and count it there", async () => {
		const user = await asNewUser();
		await seed(user, [
			base("m1", "music", "music_topic_sadness"),
			base("m2", "music", "music_topic_calm_peace", {
				secondaryTopic: "music_topic_sadness",
			}),
			base("m3", "music", "music_topic_calm_peace", {
				active: false,
				secondaryTopic: "music_topic_sadness",
			}),
		]);

		const tracks = await user.t.query(api.browse.getTopic, { slug: "sadness" });
		expect(tracks.map((t) => t.slug)).toEqual(["m1", "m2"]);

		const topics = await user.t.query(api.browse.getTopics, {});
		expect(topics.map((t) => [t.slug, t.musicCount])).toEqual([
			["calm_peace", 1],
			["sadness", 2],
		]);
	});

	it("show a topic whose only active tracks are listed under it as a secondary", async () => {
		const user = await asNewUser();
		await seed(user, [
			base("m1", "music", "music_topic_sadness", { active: false }),
			base("m2", "music", "music_topic_calm_peace", {
				secondaryTopic: "music_topic_sadness",
			}),
		]);

		const topics = await user.t.query(api.browse.getTopics, {});
		expect(topics.map((t) => [t.slug, t.musicCount])).toEqual([
			["calm_peace", 1],
			["sadness", 1],
		]);
	});
});

describe("browse.getTopicTitle", () => {
	it("uses the curated title, else the one derived from the slug", async () => {
		const user = await asNewUser();
		await user.root.run(async (ctx) => {
			await ctx.db.insert("topics", {
				slug: "sleep_rest",
				thumbKey: "thumb/s.webp",
				thumbSha256: "s",
				title: "Sleep & Rest",
			});
		});
		expect(
			await user.t.query(api.browse.getTopicTitle, { slug: "sleep_rest" })
		).toBe("Sleep & Rest");
		expect(
			await user.t.query(api.browse.getTopicTitle, { slug: "self_worth" })
		).toBe("Self worth");
	});
});
