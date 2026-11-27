import { describe, expect, it } from "vitest";
import {
	facetLabel,
	readTimeLine,
	sectionOf,
	showsSeeAll,
	trackSubtitle,
} from "@/features/explore/search/search-model";

describe("search model", () => {
	it("labels a subject slug", () => {
		expect(facetLabel("self-WORTH")).toBe("Self worth");
	});

	it("reads time, listen and views, leaving out what's missing", () => {
		expect(readTimeLine(4)).toBe("4 min read");
		expect(readTimeLine(4, 1, 6)).toBe("4 min read · 6 min listen · 1 view");
		expect(readTimeLine(4, 1200)).toBe("4 min read · 1.2k views");
		expect(readTimeLine(4, 3000)).toBe("4 min read · 3k views");
	});

	it("puts the episode before the attribution", () => {
		expect(trackSubtitle({ attribution: "Sage" })).toBe("Sage");
		expect(trackSubtitle({ attribution: "Sage", episodeNumber: 2 })).toBe(
			"Episode 2 · Sage"
		);
		expect(trackSubtitle({ episodeNumber: 3 })).toBe("Episode 3");
	});

	it("falls back to Lantern for an unknown section", () => {
		expect(sectionOf("music")).toBe("music");
		expect(sectionOf("places")).toBe("places");
		expect(sectionOf("toString")).toBe("lantern");
		expect(sectionOf(undefined)).toBe("lantern");
	});

	it("offers See all only for this query's results past the preview", () => {
		expect(showsSeeAll("calm", true, 6)).toBe(true);
		expect(showsSeeAll("calm", true, 5)).toBe(false);
		expect(showsSeeAll("calm", false, 9)).toBe(false);
		expect(showsSeeAll("", true, 9)).toBe(false);
	});
});
