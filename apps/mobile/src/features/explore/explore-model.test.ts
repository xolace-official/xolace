import { describe, expect, it } from "vitest";
import { LIST, TILES, topicTracks } from "@/features/explore/dev/fixtures";
import {
	countLine,
	familyOf,
	hasBothKinds,
	initialFilter,
	listMeta,
	minutesOf,
	rowLabel,
	topicMeta,
	topicSections,
	topicsInOrder,
} from "@/features/explore/explore-model";

const sleep = topicTracks("sleep");
const bySlug = (slug: string) => {
	const t = [...LIST.support, ...LIST.music].find((x) => x.slug === slug);
	if (!t) {
		throw new Error(slug);
	}
	return t;
};

describe("minutesOf", () => {
	it("rounds to whole minutes and never says 0", () => {
		expect(minutesOf(40)).toBe(1);
		expect(minutesOf(0)).toBe(1);
		expect(minutesOf(450)).toBe(8);
		expect(minutesOf(600)).toBe(10);
	});
});

describe("countLine", () => {
	it("says both kinds, or the one there is", () => {
		expect(countLine({ musicCount: 8, supportCount: 12 })).toBe(
			"12 spoken · 8 music"
		);
		expect(countLine({ musicCount: 0, supportCount: 9 })).toBe("9 spoken");
		expect(countLine({ musicCount: 8, supportCount: 0 })).toBe("8 music");
	});
});

describe("topicsInOrder", () => {
	it("sorts by slug, whatever order the query returns", () => {
		const shuffled = [...TILES].reverse();
		expect(topicsInOrder(shuffled).map((t) => t.slug)).toEqual(
			TILES.map((t) => t.slug)
		);
	});
});

describe("listMeta", () => {
	it("gives an episode its series and number", () => {
		expect(listMeta(bySlug("dev-letting"))).toBe(
			"Wind down · Episode 2 · 9 min"
		);
	});
	it("gives a single its topic and length", () => {
		expect(listMeta(bySlug("dev-land"))).toBe("Anxiety · 2 min");
	});
	it("gives music its length: production doesn't loop it", () => {
		expect(listMeta(bySlug("dev-quiet"))).toBe("Sleep · 4 min");
	});
	it("falls back to the length without a topic title", () => {
		expect(listMeta({ ...bySlug("dev-land"), topicTitle: "" })).toBe("2 min");
	});
	it("on a topic, the length alone", () => {
		expect(topicMeta(bySlug("dev-letting"))).toBe("9 min");
	});
});

describe("initialFilter and familyOf", () => {
	it("preselects a known chip only when there are chips", () => {
		expect(initialFilter("music", true)).toBe("music");
		expect(initialFilter("support", true)).toBe("support");
		expect(initialFilter("music", false)).toBe("all");
		expect(initialFilter("podcasts", true)).toBe("all");
		expect(initialFilter(undefined, true)).toBe("all");
	});
	it("opens Support audio unless asked for music", () => {
		expect(familyOf("music")).toBe("music");
		expect(familyOf("anything")).toBe("support");
		expect(familyOf(undefined)).toBe("support");
	});
	it("shows chips only for a topic with both kinds", () => {
		expect(hasBothKinds({ musicCount: 1, supportCount: 1 })).toBe(true);
		expect(hasBothKinds({ musicCount: 8, supportCount: 0 })).toBe(false);
	});
});

describe("topicSections", () => {
	it("All: the series, then the singles, then music", () => {
		const s = topicSections(sleep, "all");
		expect(s.map((x) => x.heading)).toEqual([
			"Wind down · A series",
			"Support audio",
			"Music",
		]);
		expect(s.map((x) => x.tracks.length)).toEqual([5, 7, 8]);
	});
	it("Support audio leaves music out, Music leaves the spoken out", () => {
		expect(topicSections(sleep, "support").map((x) => x.key)).toEqual([
			"series:wind-down",
			"support",
		]);
		expect(topicSections(sleep, "music").map((x) => x.key)).toEqual(["music"]);
	});
	it("runs episodes by number, whatever order they arrive in", () => {
		const [series] = topicSections([...sleep].reverse(), "all");
		expect(series.tracks.map((t) => t.episodeNumber)).toEqual([1, 2, 3, 4, 5]);
	});
	it("a music-only topic is one section", () => {
		expect(topicSections(topicTracks("calm"), "all")).toHaveLength(1);
	});
	it("nothing for no tracks", () => {
		expect(topicSections([], "all")).toEqual([]);
	});
});

describe("rowLabel", () => {
	const t = bySlug("dev-scan");
	it("reads the title and meta", () => {
		expect(rowLabel(t, "10 min", false)).toBe("A body scan for bed, 10 min");
	});
	it("adds the kind on a topic and the lock for a free listener", () => {
		expect(rowLabel(t, "10 min", true, true)).toBe(
			"A body scan for bed, 10 min, spoken, Xolace+, locked"
		);
	});
});
