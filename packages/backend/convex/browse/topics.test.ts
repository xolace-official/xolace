// @vitest-environment edge-runtime
/**
 * Topic reads: the grid (#339), one topic's tracks with secondary topics,
 * the topic title, and Explore's topic page header (B5), whose counts match
 * `getTopic`'s rows. R2 URL minting is faked at the `r2` seam.
 */
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

async function seed(user: SeededUser, tracks: Track[]) {
	await user.root.run(async (ctx) => {
		for (const t of tracks) {
			await ctx.db.insert("audio_tracks", t);
		}
	});
}

const header = (user: SeededUser, slug: string) =>
	user.t.query(api.browse.topics.getTopicHeader, { slug });

describe("browse.topics.getTopicHeader", () => {
	it("counts the topic's active tracks per family, secondary-topic music included", async () => {
		const user = await asNewUser();
		await seed(user, [
			track("ep1", "support", "audio_topic_sleep", {
				episodeNumber: 1,
				series: "wind-down",
				seriesTitle: "Wind down",
			}),
			track("s1", "support", "audio_topic_sleep"),
			track("s2", "support", "audio_topic_sleep", { active: false }),
			track("m1", "music", "music_topic_sleep"),
			track("m2", "music", "music_topic_calm_peace", {
				secondaryTopic: "music_topic_sleep",
			}),
			track("m3", "music", "music_topic_calm_peace", {
				active: false,
				secondaryTopic: "music_topic_sleep",
			}),
			track("s9", "support", "audio_topic_grief"),
		]);

		expect(await header(user, "sleep")).toEqual({
			musicCount: 2,
			slug: "sleep",
			supportCount: 2,
			thumbhash: "hash-ep1",
			thumbUrl: "https://r2.test/thumb/ep1.webp",
			title: "Sleep",
		});

		// The counts are the topic screen's rows.
		const rows = await user.t.query(api.browse.topics.getTopic, {
			slug: "sleep",
		});
		expect(rows.filter((r) => r.family === "support")).toHaveLength(2);
		expect(rows.filter((r) => r.family === "music")).toHaveLength(2);
	});

	it("matches the topic's grid tile", async () => {
		const user = await asNewUser();
		await seed(user, [
			track("s1", "support", "audio_topic_sadness"),
			track("m1", "music", "music_topic_sadness"),
			track("m2", "music", "music_topic_calm_peace", {
				secondaryTopic: "music_topic_sadness",
			}),
		]);
		await user.root.run(async (ctx) => {
			await ctx.db.insert("topics", {
				slug: "sadness",
				thumbKey: "thumb/sad.webp",
				thumbSha256: "sad",
				title: "Feeling low",
			});
		});

		const tiles = await user.t.query(api.browse.topics.getTopics, {});
		for (const tile of tiles) {
			expect(await header(user, tile.slug)).toEqual(tile);
		}
	});

	it("uses the topics row's cover and curated title, keeping counts from the tracks", async () => {
		const user = await asNewUser();
		await seed(user, [track("m1", "music", "music_topic_calm_peace")]);
		await user.root.run(async (ctx) => {
			await ctx.db.insert("topics", {
				slug: "calm_peace",
				thumbhash: "hash-calm",
				thumbKey: "thumb/calm.webp",
				thumbSha256: "calm",
				title: "Calm & peace",
			});
		});

		expect(await header(user, "calm_peace")).toEqual({
			musicCount: 1,
			slug: "calm_peace",
			supportCount: 0,
			thumbhash: "hash-calm",
			thumbUrl: "https://r2.test/thumb/calm.webp",
			title: "Calm & peace",
		});
	});

	it("falls back to the slug-derived title when the row has none", async () => {
		const user = await asNewUser();
		await seed(user, [track("s1", "support", "audio_topic_self_worth")]);
		await user.root.run(async (ctx) => {
			await ctx.db.insert("topics", {
				slug: "self_worth",
				thumbKey: "thumb/sw.webp",
				thumbSha256: "sw",
			});
		});

		const got = await header(user, "self_worth");
		expect(got?.title).toBe("Self worth");
		expect(got?.thumbUrl).toBe("https://r2.test/thumb/sw.webp");
		expect(got?.thumbhash).toBeUndefined();
	});

	it("returns null for an unknown slug", async () => {
		const user = await asNewUser();
		await seed(user, [track("s1", "support", "audio_topic_sleep")]);
		expect(await header(user, "nope")).toBeNull();
	});

	it("returns null for a topic with no active track, even with a topics row", async () => {
		const user = await asNewUser();
		await seed(user, [
			track("s1", "support", "audio_topic_grief", { active: false }),
			track("m1", "music", "music_topic_grief", { active: false }),
		]);
		await user.root.run(async (ctx) => {
			await ctx.db.insert("topics", {
				slug: "grief",
				thumbKey: "thumb/grief.webp",
				thumbSha256: "grief",
				title: "Grief",
			});
		});

		expect(await header(user, "grief")).toBeNull();
		// The grid and the topic screen agree it isn't published.
		expect(await user.t.query(api.browse.topics.getTopics, {})).toEqual([]);
		expect(
			await user.t.query(api.browse.topics.getTopic, { slug: "grief" })
		).toEqual([]);
	});

	it("requires a signed-in user, like the other browse reads", async () => {
		await expect(
			asUnauthed().query(api.browse.topics.getTopicHeader, { slug: "sleep" })
		).rejects.toThrow(/not_authenticated/);
	});
});

describe("browse.topics.getTopics", () => {
	it("lists one tile per shared topic with ≥ 1 active track in either family", async () => {
		const user = await asNewUser();
		await seed(user, [
			track("s1", "support", "audio_topic_sadness"),
			track("m1", "music", "music_topic_sadness"),
			track("m2", "music", "music_topic_sadness"),
			track("m3", "music", "music_topic_calm_peace"),
			track("s2", "support", "audio_topic_grief", { active: false }),
		]);

		const topics = await user.t.query(api.browse.topics.getTopics, {});
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
			track("s1", "support", "audio_topic_sadness"),
			track("m3", "music", "music_topic_calm_peace"),
			track("s5", "support", "audio_topic_anxiety"),
			track("s9", "support", "audio_topic_grief", { active: false }),
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

		const topics = await user.t.query(api.browse.topics.getTopics, {});
		expect(topics.map((t) => [t.slug, t.title, t.thumbUrl])).toEqual([
			["anxiety", "Anxiety", "https://r2.test/thumb/s5.webp"],
			["calm_peace", "Calm peace", "https://r2.test/thumb/calm.webp"],
			["sadness", "Feeling low", "https://r2.test/thumb/sad.webp"],
		]);
	});
});

describe("browse.topics.getTopic", () => {
	it("returns both families' active tracks for one topic, episodes carrying series fields", async () => {
		const user = await asNewUser();
		await seed(user, [
			track("ep2", "support", "audio_topic_sadness", {
				episodeNumber: 2,
				series: "the-spectrum",
				seriesTitle: "The Spectrum",
			}),
			track("ep1", "support", "audio_topic_sadness", {
				episodeNumber: 1,
				series: "the-spectrum",
				seriesTitle: "The Spectrum",
			}),
			track("m1", "music", "music_topic_sadness"),
			track("m2", "music", "music_topic_sadness", { active: false }),
			track("m3", "music", "music_topic_calm_peace"),
		]);

		const tracks = await user.t.query(api.browse.topics.getTopic, {
			slug: "sadness",
		});
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
			track("m1", "music", "music_topic_sadness"),
			track("m2", "music", "music_topic_calm_peace", {
				secondaryTopic: "music_topic_sadness",
			}),
			track("m3", "music", "music_topic_calm_peace", {
				active: false,
				secondaryTopic: "music_topic_sadness",
			}),
		]);

		const tracks = await user.t.query(api.browse.topics.getTopic, {
			slug: "sadness",
		});
		expect(tracks.map((t) => t.slug)).toEqual(["m1", "m2"]);

		const topics = await user.t.query(api.browse.topics.getTopics, {});
		expect(topics.map((t) => [t.slug, t.musicCount])).toEqual([
			["calm_peace", 1],
			["sadness", 2],
		]);
	});

	it("show a topic whose only active tracks are listed under it as a secondary", async () => {
		const user = await asNewUser();
		await seed(user, [
			track("m1", "music", "music_topic_sadness", { active: false }),
			track("m2", "music", "music_topic_calm_peace", {
				secondaryTopic: "music_topic_sadness",
			}),
		]);

		const topics = await user.t.query(api.browse.topics.getTopics, {});
		expect(topics.map((t) => [t.slug, t.musicCount])).toEqual([
			["calm_peace", 1],
			["sadness", 1],
		]);
	});
});

describe("browse.getTopicTitle (flat path only)", () => {
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
			await user.t.query(api.browse.getTopicTitle, {
				slug: "sleep_rest",
			})
		).toBe("Sleep & Rest");
		expect(
			await user.t.query(api.browse.getTopicTitle, {
				slug: "self_worth",
			})
		).toBe("Self worth");
	});
});

describe("topicTitle on track items (B5)", () => {
	it("names a secondary-topic track's own topic on the topic screen", async () => {
		const user = await asNewUser();
		await seed(user, [
			track("m1", "music", "music_topic_sadness"),
			track("m2", "music", "music_topic_calm_peace", {
				secondaryTopic: "music_topic_sadness",
			}),
		]);

		const tracks = await user.t.query(api.browse.topics.getTopic, {
			slug: "sadness",
		});
		expect(tracks.map((t) => [t.slug, t.topicTitle])).toEqual([
			["m1", "Sadness"],
			["m2", "Calm peace"],
		]);
	});

	it("keeps every field old clients read, with only topicTitle added", async () => {
		const user = await asNewUser();
		await seed(user, [
			track("ep1", "support", "audio_topic_sadness", {
				episodeNumber: 1,
				series: "the-spectrum",
				seriesTitle: "The Spectrum",
				thumbhash: "hash",
			}),
		]);

		const [item] = await user.t.query(api.browse.topics.getTopic, {
			slug: "sadness",
		});
		const { _id, ...rest } = item;
		expect(rest).toEqual({
			attribution: "Sage",
			durationSec: 60,
			episodeNumber: 1,
			family: "support",
			series: "the-spectrum",
			seriesTitle: "The Spectrum",
			slug: "ep1",
			thumbhash: "hash",
			thumbUrl: "https://r2.test/thumb/ep1.webp",
			title: "ep1",
			topicTitle: "Sadness",
		});
	});
});
