import { describe, expect, it } from "vitest";
import { card } from "@/features/lantern/dev/entries";
import { hub, SUBJECTS } from "@/features/lantern/dev/fixtures";
import {
	continuePct,
	facetLabel,
	hubCountLine,
	hubDetailCount,
	isKind,
	kickerLine,
	letterOffset,
	lettersWith,
	readMarkLabel,
	readMarkOf,
	readTimeLine,
	reasonLine,
	rowLabel,
	SUBJECTS_LAYOUT,
	subjectsList,
	toggleIn,
	trackMinutes,
} from "@/features/lantern/lantern-model";

describe("copy", () => {
	it("names a facet slug", () => {
		expect(facetLabel("asking-for-help")).toBe("Asking for help");
		expect(facetLabel("SLEEP")).toBe("Sleep");
	});

	it("writes production's meta line, compacting views", () => {
		expect(readTimeLine(6, 1240, 7)).toBe(
			"6 min read · 7 min listen · 1.2k views"
		);
		expect(readTimeLine(4, 1000)).toBe("4 min read · 1k views");
		expect(readTimeLine(4, 1)).toBe("4 min read · 1 view");
		expect(readTimeLine(3)).toBe("3 min read");
	});

	it("kicks a row with its kind and primary subject", () => {
		expect(kickerLine(card("thoughts-at-night"))).toBe("Explainer · Sleep");
	});

	it("says why For you picked an entry", () => {
		expect(reasonLine({ axis: "audience", slug: "student" })).toBe(
			"For students"
		);
		expect(reasonLine({ axis: "emotion", slug: "anxious" })).toBe(
			"You named anxious"
		);
		expect(reasonLine({ axis: "lifeArea", slug: "sleep" })).toBe(
			"Around sleep"
		);
	});

	it("never reads Continue as 0% or 100%", () => {
		expect(continuePct(0.001)).toBe(1);
		expect(continuePct(0.4)).toBe(40);
		expect(continuePct(0.999)).toBe(99);
	});

	it("counts a hub, and its reads only once one is finished", () => {
		expect(hubCountLine({ entries: 1, listens: 0 })).toBe("1 entry");
		expect(hubCountLine({ entries: 6, listens: 3 })).toBe(
			"6 entries · 3 to listen"
		);
		expect(hubCountLine({ entries: 5, listens: 1, read: 0 })).toBe(
			"5 entries · 1 to listen"
		);
		expect(hubCountLine({ entries: 5, listens: 1, read: 2 })).toBe(
			"5 entries · 1 to listen · 2 read"
		);
	});

	it("counts a hub's own items: reads, listens, and the finished reads", () => {
		expect(hubDetailCount(hub().items)).toBe(
			"5 entries · 1 to listen · 2 read"
		);
		expect(hubDetailCount(hub("nights", true).items)).toBe(
			"5 entries · 1 to listen"
		);
	});
});

describe("the read mark", () => {
	it("is a Read chip once finished, even with a place stored", () => {
		expect(readMarkOf({ finished: true, position: 0.5 })).toEqual({
			kind: "read",
		});
	});

	it("is the partway line between nothing and the ceiling", () => {
		expect(readMarkOf({ finished: false, position: 0.4 })).toEqual({
			kind: "partway",
			share: 0.4,
		});
	});

	it("is nothing when unread, at 0, or at the ceiling", () => {
		expect(readMarkOf({ finished: false })).toBeNull();
		expect(readMarkOf({ finished: false, position: 0 })).toBeNull();
		expect(readMarkOf({ finished: false, position: 0.98 })).toBeNull();
		expect(readMarkOf({})).toBeNull();
	});

	it("tells VoiceOver", () => {
		expect(readMarkLabel({ kind: "read" })).toBe(". Read");
		expect(readMarkLabel({ kind: "partway", share: 0.4 })).toBe(
			". 40 percent read"
		);
		expect(readMarkLabel(null)).toBe("");
		expect(rowLabel(card("thoughts-at-night"))).toBe(
			"Why your mind gets loud at night. Explainer, Sleep. 40 percent read"
		);
	});
});

describe("A–Z", () => {
	const list = subjectsList(SUBJECTS);

	it("lists each letter before its subjects, A to Z", () => {
		expect(list.items.slice(0, 3)).toEqual([
			{ kind: "letter", letter: "A" },
			{ count: 3, kind: "subject", slug: "anxiety" },
			{ count: 1, kind: "subject", slug: "asking-for-help" },
		]);
		expect(list.headers.map((i) => list.items[i])).toHaveLength(
			lettersWith(SUBJECTS).size
		);
	});

	it("knows every item's offset from the fixed heights", () => {
		const { header, row } = SUBJECTS_LAYOUT;
		expect(list.offsets.slice(0, 4)).toEqual([
			0,
			header,
			header + row,
			header + row * 2,
		]);
	});

	it("opens at a letter, or the top for none or an unknown one", () => {
		const l = list.items.findIndex(
			(it) => it.kind === "letter" && it.letter === "L"
		);
		expect(letterOffset(list, "L")).toBe(list.offsets[l]);
		expect(letterOffset(list, undefined)).toBe(0);
		expect(letterOffset(list, "Q")).toBe(0);
	});

	it("dims the letters with no subject", () => {
		const has = lettersWith(SUBJECTS);
		expect(has.has("L")).toBe(true);
		expect(has.has("Q")).toBe(false);
	});
});

describe("small rules", () => {
	it("toggles an audience in the order picked", () => {
		expect(toggleIn(["student"], "carer")).toEqual(["student", "carer"]);
		expect(toggleIn(["student", "carer"], "student")).toEqual(["carer"]);
	});

	it("rounds a track to whole minutes, at least one", () => {
		expect(trackMinutes(300)).toBe(5);
		expect(trackMinutes(20)).toBe(1);
	});

	it("knows the kinds", () => {
		expect(isKind("story")).toBe(true);
		expect(isKind("poem")).toBe(false);
		expect(isKind(undefined)).toBe(false);
	});
});
