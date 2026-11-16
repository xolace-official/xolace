// @vitest-environment edge-runtime
/**
 * One family's paginated list (#339, docs/paths-v1.md §9.3). R2 URL minting
 * is faked at the `r2` seam.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { asNewUser, type SeededUser } from "../test/harness.helpers";
import { aggregatesMock } from "../test/mocks.helpers";

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

describe("browse.family.listByFamily", () => {
	it("pages one family's active tracks and skips retired rows", async () => {
		const user = await asNewUser();
		await seed(user, [
			base("s1", "support", "audio_topic_anxiety"),
			base("s2", "support", "audio_topic_grief", { active: false }),
			base("s3", "support", "audio_topic_grief"),
			base("m1", "music", "music_topic_calm_peace"),
		]);

		const first = await user.t.query(api.browse.family.listByFamily, {
			family: "support",
			paginationOpts: { cursor: null, numItems: 1 },
		});
		expect(first.page.map((t) => t.slug)).toEqual(["s1"]);
		expect(first.page[0].thumbUrl).toBe("https://r2.test/thumb/s1.webp");
		expect(first.page[0].attribution).toBe("Sage");
		expect(first.isDone).toBe(false);

		const second = await user.t.query(api.browse.family.listByFamily, {
			family: "support",
			paginationOpts: { cursor: first.continueCursor, numItems: 5 },
		});
		expect(second.page.map((t) => t.slug)).toEqual(["s3"]);
		expect(second.isDone).toBe(true);
	});
});

describe("topicTitle on track items (B5)", () => {
	it("carries each track's own topic title: curated, else slug-derived", async () => {
		const user = await asNewUser();
		await seed(user, [
			base("s1", "support", "audio_topic_sleep_rest"),
			base("s2", "support", "audio_topic_self_worth"),
			base("s3", "support", "audio_topic_sleep_rest"),
		]);
		await user.root.run(async (ctx) => {
			await ctx.db.insert("topics", {
				slug: "sleep_rest",
				thumbKey: "thumb/s.webp",
				thumbSha256: "s",
				title: "Sleep & Rest",
			});
		});

		const { page } = await user.t.query(api.browse.family.listByFamily, {
			family: "support",
			paginationOpts: { cursor: null, numItems: 10 },
		});
		expect(page.map((t) => [t.slug, t.topicTitle])).toEqual([
			["s1", "Sleep & Rest"],
			["s2", "Self worth"],
			["s3", "Sleep & Rest"],
		]);
	});
});
