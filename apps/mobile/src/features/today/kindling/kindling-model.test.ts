import { describe, expect, it } from "vitest";
import {
	cubicBetween,
	firstWaiting,
	kindlingView,
	newlyTended,
	nextRow,
	nodesFor,
	type TwigView,
	tendedCount,
} from "./kindling-model";

const twig = (
	state: TwigView["state"],
	title: string,
	length = "A FEW MINUTES"
): TwigView => ({ id: title, length, state, title });

describe("nodesFor", () => {
	it("keeps the board's four nodes", () => {
		expect(nodesFor(4)).toEqual([
			[24, 36],
			[116, 26],
			[208, 38],
			[298, 28],
		]);
	});

	it("spreads three nodes over the same span, with the board's heights", () => {
		expect(nodesFor(3)).toEqual([
			[24, 36],
			[161, 26],
			[298, 38],
		]);
	});
});

describe("cubicBetween", () => {
	it("draws the board's first stretch", () => {
		expect(cubicBetween([24, 36], [116, 26])).toEqual([
			[24, 36],
			[56, 36],
			[84, 26],
			[116, 26],
		]);
	});
});

describe("kindlingView", () => {
	const active = {
		_id: "p1",
		generatedAt: 0,
		sessionId: "s1",
		twigs: [
			{
				_id: "a",
				actionType: "breathing",
				kind: "breathing",
				order: 0,
				params: null,
				state: "done",
				why: "",
			},
			{
				_id: "b",
				actionType: "audio_topic_x",
				kind: "audio",
				order: 1,
				params: null,
				state: "pending",
				title: " When it all arrives ",
				why: "",
			},
			{
				_id: "c",
				actionType: "bridge",
				kind: "bridge",
				order: 2,
				params: null,
				state: "skipped",
				title: "",
				why: "",
			},
		],
	} as unknown as Parameters<typeof kindlingView>[0];

	it("names each step, falling back to its kind's title", () => {
		expect(kindlingView(active)?.twigs).toEqual([
			{
				id: "a",
				length: "A FEW MINUTES",
				state: "done",
				title: "Sit with this",
			},
			{
				id: "b",
				length: "SOMETHING TO HEAR",
				state: "pending",
				title: "When it all arrives",
			},
			{
				id: "c",
				length: "WHEN YOU'RE READY",
				state: "skipped",
				title: "Tell someone you trust",
			},
		]);
	});

	it("is none with no kindling, or one with no steps", () => {
		expect(kindlingView(null)).toBeNull();
		expect(
			kindlingView({ ...active, twigs: [] } as unknown as Parameters<
				typeof kindlingView
			>[0])
		).toBeNull();
	});
});

describe("counting", () => {
	it("counts only done steps as tended", () => {
		expect(tendedCount(["done", "skipped", "pending"])).toBe(1);
	});

	it("finds the first step waiting", () => {
		expect(firstWaiting(["done", "skipped", "pending"])).toBe(2);
		expect(firstWaiting(["done", "done"])).toBe(-1);
	});
});

describe("nextRow", () => {
	const twigs = [
		twig("done", "Name it"),
		twig("pending", "Sit with this"),
		twig("pending", "Write a line", "2 MINUTES"),
	];
	const states = twigs.map((t) => t.state);

	it("shows the next step", () => {
		expect(nextRow(twigs, states, -1)).toEqual({
			eyebrow: "NEXT · A FEW MINUTES",
			title: "Sit with this",
		});
	});

	it("shows a peeked step: done, later or passed by", () => {
		expect(nextRow(twigs, states, 0).eyebrow).toBe("DONE");
		expect(nextRow(twigs, states, 2)).toEqual({
			eyebrow: "LATER · 2 MINUTES",
			title: "Write a line",
		});
		expect(nextRow(twigs, ["skipped", "pending", "pending"], 0).eyebrow).toBe(
			"PASSED BY"
		);
	});

	it("ends with all tended, or done when some were passed by", () => {
		expect(nextRow(twigs, ["done", "done", "done"], -1)).toEqual({
			eyebrow: "ALL THREE TENDED",
			title: "The fire's kept. Flux saved it.",
		});
		expect(nextRow(twigs, ["done", "skipped", "done"], -1).eyebrow).toBe(
			"THIS KINDLING IS DONE"
		);
	});
});

describe("newlyTended", () => {
	it("finds a step done since Today last showed it", () => {
		expect(
			newlyTended(["done", "pending", "pending"], ["done", "done", "pending"])
		).toBe(1);
	});

	it("is -1 when nothing new was tended", () => {
		expect(newlyTended(["done", "pending"], ["done", "pending"])).toBe(-1);
		expect(newlyTended(["done", "pending"], ["done", "skipped"])).toBe(-1);
	});
});
