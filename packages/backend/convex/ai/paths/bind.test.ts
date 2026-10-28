import { describe, expect, it } from "vitest";
import {
	type BindTrack,
	type BindUnderstanding,
	bindTwig,
	slugKey,
} from "./bind";

const track = (over: Partial<BindTrack> & { slug: string }): BindTrack => ({
	active: true,
	family: "support",
	tags: [],
	topic: "audio_topic_anxiety_relief",
	...over,
});

const u = (over: Partial<BindUnderstanding> = {}): BindUnderstanding => ({
	primaryEmotion: "anxiety",
	suggestedSpecialty: undefined,
	thematicTags: [],
	...over,
});

const k = (...slugs: string[]) =>
	slugs.map((s) => slugKey("audio_topic_anxiety_relief", s));

const bind = (
	actionType: string,
	tracks: BindTrack[],
	over?: Partial<BindUnderstanding>
) => bindTwig(actionType, u(over), tracks);

describe("bindTwig", () => {
	it("breathing and xolacer bind without content", () => {
		expect(bind("breathing", [])).toEqual({ exercise: "sit-with-this" });
		expect(bind("xolacer", [])).toBeNull();
		expect(bind("xolacer", [], { suggestedSpecialty: "burnout" })).toEqual({
			specialty: "burnout",
		});
	});

	it("read binds a free-text secondary to entries shelved under its emotion (#536)", () => {
		const entries = [{ emotions: ["grief"], lifeAreas: [], slug: "on-grief" }];
		expect(
			bindTwig(
				"read",
				u({ primaryEmotion: "love", secondaryEmotion: "heartbreak" }),
				[],
				entries
			)
		).toEqual({ slug: "on-grief" });
		expect(
			bindTwig("read", u({ primaryEmotion: "love" }), [], entries)
		).toBeNull();
	});

	it("a catalogued try-this twig binds without content; an uncatalogued one never binds (#567)", () => {
		expect(bind("try_brisk_walk", [])).toEqual({ exercise: "try_brisk_walk" });
		expect(bind("try_quit_your_job", [])).toBeNull();
	});

	it("bridge binds without content", () => {
		expect(bind("bridge", [])).toEqual({ exercise: "trusted-bridge" });
	});

	it("binds audio_topic_* to the best tag match in its own family and topic", () => {
		const tracks = [
			track({ slug: "b", tags: ["anxiety", "racing-thoughts"] }),
			track({ slug: "a", tags: ["anxiety"] }),
			track({
				family: "music",
				slug: "music",
				tags: ["anxiety", "racing-thoughts"],
			}),
			track({
				slug: "grief",
				tags: ["anxiety", "racing-thoughts"],
				topic: "audio_topic_grief",
			}),
		];
		expect(
			bind("audio_topic_anxiety_relief", tracks, {
				thematicTags: ["racing-thoughts"],
			})
		).toEqual({ slug: "b" });
	});

	it("breaks ties deterministically, independent of input order", () => {
		const a = track({ slug: "a", tags: ["anxiety"] });
		const b = track({ slug: "b", tags: ["anxiety"] });
		const forward = bind("audio_topic_anxiety_relief", [a, b]);
		const reversed = bind("audio_topic_anxiety_relief", [b, a]);
		expect(reversed).toEqual(forward);
	});

	it("spreads ties across sessions instead of collapsing onto one track", () => {
		const a = track({ slug: "a", tags: ["anxiety"] });
		const b = track({ slug: "b", tags: ["anxiety"] });
		const first = bind("audio_topic_anxiety_relief", [a, b], {
			primaryEmotion: "anxiety",
		});
		const second = bind("audio_topic_anxiety_relief", [a, b], {
			primaryEmotion: "sadness",
		});
		expect(first).not.toEqual(second);
		// Same session re-run (any input order) always binds the same slug.
		expect(
			bind("audio_topic_anxiety_relief", [b, a], { primaryEmotion: "anxiety" })
		).toEqual(first);
	});

	it("spreads ties the same regardless of thematicTags order or duplicates", () => {
		const a = track({ slug: "a", tags: ["anxiety"] });
		const b = track({ slug: "b", tags: ["anxiety"] });
		const base = bind("audio_topic_anxiety_relief", [a, b], {
			thematicTags: ["racing-thoughts", "sleep"],
		});
		const reordered = bind("audio_topic_anxiety_relief", [a, b], {
			thematicTags: ["sleep", "racing-thoughts"],
		});
		const duplicated = bind("audio_topic_anxiety_relief", [a, b], {
			thematicTags: ["racing-thoughts", "sleep", "sleep", "racing-thoughts"],
		});
		expect(reordered).toEqual(base);
		expect(duplicated).toEqual(base);
	});

	it("music_topic_* binds only against the music family", () => {
		const tracks = [
			track({ slug: "spoken", topic: "music_topic_sadness" }),
			track({ family: "music", slug: "tune", topic: "music_topic_sadness" }),
		];
		expect(bind("music_topic_sadness", tracks)).toEqual({ slug: "tune" });
		expect(bind("music_topic_sadness", [tracks[0]])).toBeNull();
	});

	it("a music track binds under its secondary topic too, on tags and on meaning", () => {
		const own = track({
			family: "music",
			slug: "own",
			topic: "music_topic_sadness",
		});
		const borrowed = track({
			family: "music",
			secondaryTopic: "music_topic_sadness",
			slug: "borrowed",
			tags: ["grief"],
			topic: "music_topic_calm_peace",
		});
		expect(bind("music_topic_sadness", [own, borrowed])).toEqual({
			slug: "borrowed",
		});
		expect(
			bind("music_topic_sadness", [
				{ ...own, similarity: 0.7 },
				{ ...borrowed, similarity: 0.4 },
			])
		).toEqual({ slug: "own" });
		expect(bind("music_topic_calm_peace", [own])).toBeNull();
	});

	it("episode_reframe binds only to reframe-series rows, across topics", () => {
		const tracks = [
			track({ series: "the-spectrum", slug: "spectrum" }),
			track({ slug: "plain" }),
			track({
				series: "reality-not-false-hope",
				slug: "reframe",
				topic: "audio_topic_shame",
			}),
		];
		expect(bind("episode_reframe", tracks)).toEqual({ slug: "reframe" });
		expect(bind("episode_reframe", tracks.slice(0, 2))).toBeNull();
	});

	it("tier never gates: episodes of any tier and standalones compete on tags only", () => {
		const t4 = track({
			series: "the-spectrum",
			slug: "t4",
			tags: ["anxiety", "racing-thoughts"],
		});
		const standalone = track({ slug: "standalone", tags: ["anxiety"] });
		expect(
			bind("audio_topic_anxiety_relief", [standalone, t4], {
				thematicTags: ["racing-thoughts"],
			})
		).toEqual({ slug: "t4" });
		const t4Tied = track({
			series: "the-spectrum",
			slug: "t4",
			tags: ["anxiety"],
		});
		expect(bind("audio_topic_anxiety_relief", [t4Tied, standalone])).toEqual(
			bind("audio_topic_anxiety_relief", [standalone, t4Tied])
		);
	});

	it("skips inactive rows and unknown action types", () => {
		expect(
			bind("audio_topic_anxiety_relief", [
				track({ active: false, slug: "off" }),
			])
		).toBeNull();
		expect(bind("not_a_key", [track({ slug: "x" })])).toBeNull();
	});

	it("lets a compounding domain's life areas outweigh tonight's own tags (#521)", () => {
		const racing = track({
			slug: "racing",
			tags: ["anxiety", "racing-thoughts"],
		});
		const rest = track({ slug: "rest", tags: ["anxiety", "sleep", "health"] });
		const tags = { thematicTags: ["racing-thoughts"] };
		expect(bind("audio_topic_anxiety_relief", [racing, rest], tags)).toEqual({
			slug: "racing",
		});
		expect(
			bind("audio_topic_anxiety_relief", [racing, rest], {
				...tags,
				compoundingTags: ["health", "sleep"],
			})
		).toEqual({ slug: "rest" });
	});
	it("a slug skipped before loses a tie to an unskipped one, never a better score (#566)", () => {
		const a = track({ slug: "a", tags: ["anxiety"] });
		const b = track({ slug: "b", tags: ["anxiety"] });
		const first = bind("audio_topic_anxiety_relief", [a, b]) as {
			slug: string;
		};
		const other = first.slug === "a" ? { slug: "b" } : { slug: "a" };
		expect(
			bind("audio_topic_anxiety_relief", [a, b], {
				skippedSlugs: k(first.slug),
			})
		).toEqual(other);
		// Every tied slug skipped: back to the seeded pick.
		expect(
			bind("audio_topic_anxiety_relief", [a, b], { skippedSlugs: k("a", "b") })
		).toEqual(first);
		const better = track({ slug: "better", tags: ["anxiety", "sleep"] });
		expect(
			bind("audio_topic_anxiety_relief", [a, better], {
				skippedSlugs: k("better"),
				thematicTags: ["sleep"],
			})
		).toEqual({ slug: "better" });
	});
	it("a returning stretch re-offers its previous tended slug: after the score, before a skip (#566)", () => {
		const a = track({ slug: "a", tags: ["anxiety"] });
		const b = track({ slug: "b", tags: ["anxiety"] });
		const first = bind("audio_topic_anxiety_relief", [a, b]) as {
			slug: string;
		};
		const other = first.slug === "a" ? "b" : "a";
		expect(
			bind("audio_topic_anxiety_relief", [a, b], { reofferSlugs: k(other) })
		).toEqual({ slug: other });
		// Re-offer outranks a skip on the same slug.
		expect(
			bind("audio_topic_anxiety_relief", [a, b], {
				reofferSlugs: k(other),
				skippedSlugs: k(other),
			})
		).toEqual({ slug: other });
		// Gone from the candidates (inactive, finished read): nothing to re-offer.
		expect(
			bind("audio_topic_anxiety_relief", [a, b], { reofferSlugs: k("retired") })
		).toEqual(first);
		// Never over a better score.
		const better = track({ slug: "better", tags: ["anxiety", "sleep"] });
		expect(
			bind("audio_topic_anxiety_relief", [a, better], {
				reofferSlugs: k("a"),
				thematicTags: ["sleep"],
			})
		).toEqual({ slug: "better" });
		const entries = [
			{ emotions: ["anxiety"], lifeAreas: [], slug: "on-worry" },
			{ emotions: ["anxiety"], lifeAreas: [], slug: "on-fear" },
		];
		expect(
			bindTwig(
				"read",
				u({ reofferSlugs: [slugKey("read", "on-fear")] }),
				[],
				entries
			)
		).toEqual({ slug: "on-fear" });
		expect(
			bindTwig(
				"read",
				u({ reofferSlugs: [slugKey("read", "on-worry")] }),
				[],
				entries
			)
		).toEqual({ slug: "on-worry" });
	});
	it("history only touches slugs of its own twig type (#566)", () => {
		const a = track({ slug: "a", tags: ["anxiety"] });
		const b = track({ slug: "b", tags: ["anxiety"] });
		const first = bind("audio_topic_anxiety_relief", [a, b]) as {
			slug: string;
		};
		const other = first.slug === "a" ? "b" : "a";
		// A read with the same slug, or another topic's track, leaves this type alone.
		const elsewhere = [
			slugKey("read", first.slug),
			slugKey("audio_topic_grief", first.slug),
		];
		expect(
			bind("audio_topic_anxiety_relief", [a, b], { skippedSlugs: elsewhere })
		).toEqual(first);
		expect(
			bind("audio_topic_anxiety_relief", [a, b], {
				reofferSlugs: [slugKey("read", other)],
			})
		).toEqual(first);
	});
	describe("read binds on meaning (#568)", () => {
		const entry = (
			slug: string,
			similarity?: number,
			emotions: string[] = []
		) => ({ emotions, lifeAreas: [], similarity, slug });
		const read = (
			entries: ReturnType<typeof entry>[],
			over?: Partial<BindUnderstanding>
		) => bindTwig("read", u(over), [], entries) as { slug: string } | null;

		it("binds an entry close in meaning that shares no facet", () => {
			expect(read([entry("on-dread", 0.62)])).toEqual({ slug: "on-dread" });
		});
		it("meaning outranks facet overlap once above the floor", () => {
			expect(
				read([
					entry("facet-match", undefined, ["anxiety"]),
					entry("on-dread", 0.62),
				])
			).toEqual({ slug: "on-dread" });
		});
		it("below the floor falls back to facet overlap, and to nothing without one", () => {
			expect(
				read([entry("facet-match", undefined, ["anxiety"]), entry("far", 0.05)])
			).toEqual({ slug: "facet-match" });
			expect(read([entry("far", 0.05)])).toBeNull();
		});
		it("a better band wins; inside one band the history rules decide (#566)", () => {
			expect(
				read([entry("a", 0.61), entry("b", 0.71)], {
					skippedSlugs: [slugKey("read", "b")],
				})
			).toEqual({ slug: "b" });
			const tied = [entry("a", 0.61), entry("b", 0.64)];
			const first = read(tied)!;
			const other = first.slug === "a" ? "b" : "a";
			expect(
				read(tied, { skippedSlugs: [slugKey("read", first.slug)] })
			).toEqual({ slug: other });
			expect(read([...tied].reverse())).toEqual(first);
		});
	});
	describe("tracks bind on meaning inside the topic (#572)", () => {
		const at = (
			slug: string,
			similarity?: number,
			over: Partial<BindTrack> = {}
		) => track({ similarity, slug, ...over });
		const relief = (tracks: BindTrack[], over?: Partial<BindUnderstanding>) =>
			bind("audio_topic_anxiety_relief", tracks, over);

		it("the closest track in the topic wins over tag overlap", () => {
			expect(
				relief([
					at("tagged", undefined, { tags: ["anxiety"] }),
					at("on-dread", 0.62),
				])
			).toEqual({ slug: "on-dread" });
		});
		it("never leaves the model's topic, however close another topic's track is", () => {
			const other = at("elsewhere", 0.95, { topic: "audio_topic_grief" });
			expect(relief([other, at("here", 0.1, { tags: ["anxiety"] })])).toEqual({
				slug: "here",
			});
			expect(relief([other])).toBeNull();
			const reframe = at("reframe", 0.4, {
				series: "reality-not-false-hope",
				topic: "audio_topic_shame",
			});
			expect(
				bind("episode_reframe", [at("close-plain", 0.9), reframe])
			).toEqual({ slug: "reframe" });
		});
		it("below the floor falls back to tag overlap; a topic with one track binds it", () => {
			expect(
				relief([at("tagged", 0.05, { tags: ["anxiety"] }), at("far", 0.1)])
			).toEqual({ slug: "tagged" });
			expect(relief([at("only", 0.01)])).toEqual({ slug: "only" });
		});
		it("a better band wins; inside one band the history rules decide (#566)", () => {
			expect(
				relief([at("a", 0.61), at("b", 0.71)], { skippedSlugs: k("b") })
			).toEqual({ slug: "b" });
			const tied = [at("a", 0.61), at("b", 0.64)];
			const first = relief(tied) as { slug: string };
			const other = first.slug === "a" ? "b" : "a";
			expect(relief(tied, { skippedSlugs: k(first.slug) })).toEqual({
				slug: other,
			});
		});
	});
});
