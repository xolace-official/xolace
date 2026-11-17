import { describe, expect, it } from "vitest";
import { FINE, NIGHT, WINTER } from "@/features/lantern/reader/dev/reads";
import {
	attributionLines,
	creditMark,
	dwellLeft,
	END_SLACK,
	endOfRead,
	headerCredit,
	leaveShare,
	MOVED,
	metaLabel,
	metaLine,
	minutesLeft,
	mmss,
	pickUpAt,
	placeKeeper,
	prepareBody,
	READ_OPENS_AT,
	resumeOnOpen,
} from "@/features/lantern/reader/reader-model";

describe("where a read opens (§5.3)", () => {
	it("keeps production's resume until the owner decides", () => {
		expect(READ_OPENS_AT).toBe("place");
	});

	it("opens at the stored place and offers no pill", () => {
		expect(resumeOnOpen("place", 0.4)).toBe(0.4);
		expect(pickUpAt("place", 0.4)).toBeNull();
	});

	it("opening at the top offers the place instead", () => {
		expect(resumeOnOpen("top", 0.4)).toBeNull();
		expect(pickUpAt("top", 0.4)).toBe(0.4);
	});

	it("has nothing to resume with no place, at 0, or past the ceiling", () => {
		for (const p of [null, undefined, 0, 0.98, 1]) {
			expect(resumeOnOpen("place", p)).toBeNull();
			expect(pickUpAt("top", p)).toBeNull();
		}
	});
});

describe("the place kept on leaving", () => {
	it("keeps nothing until the reader has moved, or before layout", () => {
		expect(leaveShare(MOVED - 1, 1000)).toBeNull();
		expect(leaveShare(500, 0)).toBeNull();
	});

	it("keeps the read share, and 0 past the ceiling", () => {
		expect(leaveShare(400, 1000)).toBe(0.4);
		expect(leaveShare(990, 1000)).toBe(0);
		expect(leaveShare(1200, 1000)).toBe(0);
	});
});

describe("keeping the place across a reflow", () => {
	it("scrolls to the same share once the new height is in", () => {
		const keep = placeKeeper();
		keep.arm(500, 2000); // a quarter in
		expect(keep.sized(3000)).toBe(750);
	});

	it("scrolls once: a later height change doesn't move the reader", () => {
		const keep = placeKeeper();
		keep.arm(500, 2000);
		keep.sized(3000);
		expect(keep.sized(3200)).toBeNull();
	});

	it("drops a share whose reflow kept the height, so the dock's padding doesn't jump it", () => {
		const keep = placeKeeper();
		keep.arm(500, 2000);
		keep.settle();
		expect(keep.sized(2079)).toBeNull();
	});

	it("holds the share between the top and the end, and arms nothing before a layout", () => {
		const keep = placeKeeper();
		keep.arm(2400, 2000); // overscrolled past the end
		expect(keep.sized(1000)).toBe(1000);
		keep.arm(300, 0);
		expect(keep.sized(1000)).toBeNull();
	});
});

describe("minutes left and the end", () => {
	it("counts down from the read time, never below a minute", () => {
		expect(minutesLeft(6, 0, 1000)).toBe(6);
		expect(minutesLeft(6, 400, 1000)).toBe(4);
		expect(minutesLeft(6, 1000, 1000)).toBe(1);
	});

	it("puts the end where the article's last line clears the dock, short of the bottom", () => {
		const n = {
			articleEnd: 2000,
			bottom: 34,
			maxScroll: 3000,
			sheetTop: 410,
			viewH: 844,
		};
		expect(endOfRead(n)).toBe(410 + 2000 - 844 + 34);
		expect(endOfRead({ ...n, articleEnd: 5000 })).toBe(3000 - END_SLACK);
		expect(endOfRead({ ...n, articleEnd: 0 })).toBe(Number.POSITIVE_INFINITY);
	});

	it("waits out 30% of the read time from opening", () => {
		expect(dwellLeft(0, 6, 0)).toBeCloseTo(108_000);
		expect(dwellLeft(0, 6, 200_000)).toBe(0);
	});
});

describe("copy", () => {
	it("writes the meta line and its spoken label", () => {
		expect(metaLine(NIGHT)).toBe("Explainer · 6 min read · 7 min listen");
		expect(metaLine(WINTER)).toBe("Story · A daughter’s story · 7 min read");
		expect(metaLabel(NIGHT)).toBe(
			"Explainer, adapted by Xolace, 6 min read, 7 min listen"
		);
		expect(metaLabel(FINE)).toBe(
			"Story, In their own words, from [Publisher], 6 min read"
		);
	});

	it("credits by reuse, never by the source count", () => {
		expect(headerCredit(NIGHT)).toMatchObject({
			line: "Adapted by Xolace",
			xolace: true,
		});
		expect(headerCredit(WINTER)).toMatchObject({
			line: "Written for Lantern",
			xolace: true,
		});
		expect(headerCredit(FINE)).toMatchObject({
			line: "Published as they wrote it · by Ama O.",
			name: "[Publisher]",
			xolace: false,
		});
	});

	it("marks the credit with Xolace's x, or the publisher's initial", () => {
		expect(creditMark({ name: "Xolace", xolace: true })).toBe("x");
		expect(creditMark({ name: "[Publisher]", xolace: false })).toBe("P");
		expect(creditMark({ name: "mind", xolace: false })).toBe("M");
	});

	it("lists each licence line once, and Xolace's when there's no source", () => {
		expect(attributionLines(NIGHT.sources)).toHaveLength(1);
		expect(attributionLines([])).toEqual(["© Xolace"]);
	});

	it("drops the leading title and leads a callout with its kind", () => {
		expect(prepareBody("# Title\n\nBody")).toBe("Body");
		expect(prepareBody("> [!TIP]\n> Try this")).toBe("> **Tip**\\\n> Try this");
	});

	it("writes the dock's times", () => {
		expect(mmss(72)).toBe("1:12");
		expect(mmss(420)).toBe("7:00");
		expect(mmss(5)).toBe("0:05");
	});
});
