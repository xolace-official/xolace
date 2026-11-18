import type { Id } from "@xolace/backend/dataModel";
import { describe, expect, it } from "vitest";
import {
	cubicBetween,
	firstWaiting,
	keepKindling,
	kindlingOutcome,
	kindlingView,
	newlyTended,
	nextRow,
	nodesFor,
	syncTend,
	TEND,
	type TwigView,
	tendAt,
	tendedCount,
	tendStart,
	tendWait,
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

	it("names a kind this build doesn't know", () => {
		const newer = {
			...active,
			twigs: [{ ...active?.twigs[0], kind: "dance", title: undefined }],
		} as unknown as Parameters<typeof kindlingView>[0];
		expect(kindlingView(newer)?.twigs[0]).toMatchObject({
			length: "WHEN YOU'RE READY",
			title: "A small step",
		});
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

describe("syncTend (Today's path trailing the server)", () => {
	const start = tendStart("k1", ["done", "pending", "pending"]);

	it("does nothing while the server's path is unchanged", () => {
		expect(syncTend(start, "k1", ["done", "pending", "pending"])).toBeNull();
	});

	it("holds back a step tended elsewhere, to celebrate in front", () => {
		const step = syncTend(start, "k1", ["done", "done", "pending"]);
		expect(step).toMatchObject({ changed: false, reset: false });
		expect(step?.next.shown).toEqual(["done", "pending", "pending"]);
		// Then it's the one to celebrate, and it doesn't sync twice.
		expect(
			newlyTended(step?.next.shown ?? [], ["done", "done", "pending"])
		).toBe(1);
		expect(
			syncTend(step?.next ?? start, "k1", ["done", "done", "pending"])
		).toBeNull();
	});

	it("shows a step passed by at once", () => {
		const step = syncTend(start, "k1", ["done", "skipped", "pending"]);
		expect(step).toMatchObject({ changed: true, reset: false });
		expect(step?.next.shown).toEqual(["done", "skipped", "pending"]);
	});

	it("resets on a new kindling", () => {
		const step = syncTend(start, "k2", [
			"pending",
			"pending",
			"pending",
			"pending",
		]);
		expect(step).toMatchObject({ changed: true, reset: true });
		expect(step?.next).toEqual(
			tendStart("k2", ["pending", "pending", "pending", "pending"])
		);
	});

	it("resets when the same kindling's step count changes", () => {
		const step = syncTend(start, "k1", [
			"done",
			"pending",
			"pending",
			"pending",
		]);
		expect(step).toMatchObject({ reset: true });
		expect(step?.next.shown).toHaveLength(4);
	});
});

describe("tendAt", () => {
	it("tends one step", () => {
		expect(tendAt(["done", "pending", "pending"], 1)).toEqual([
			"done",
			"done",
			"pending",
		]);
	});
});

describe("tendWait", () => {
	it("lets Today settle first", () => {
		expect(tendWait(1000, 0, false)).toBe(TEND.settleMs);
	});

	it("queues a second tend behind the one still playing", () => {
		expect(tendWait(1000, 3600, false)).toBe(3600 - 1000 + TEND.gapMs);
	});

	it("plays at once with Reduce Motion", () => {
		expect(tendWait(1000, 3600, true)).toBe(0);
	});
});

describe("keepKindling (the last snapshot once the server closes it)", () => {
	const last = {
		id: "k1",
		twigs: [twig("done", "a"), twig("done", "b"), twig("pending", "c")],
	};
	const open = { closed: false, seen: false, view: last };
	const ended = (
		states: Record<string, TwigView["state"]>,
		completed = true,
		id = "k1"
	) => ({ completed, id, states });

	it("keeps the server's kindling, and changes nothing while it's the same", () => {
		expect(keepKindling(null, last, undefined, true)).toEqual(open);
		expect(keepKindling(open, { ...last }, undefined, true)).toBeUndefined();
	});

	it("waits while the server or the outcome loads, and keeps nothing it never had", () => {
		expect(keepKindling(null, undefined, undefined, true)).toBeUndefined();
		expect(keepKindling(null, null, null, true)).toBeUndefined();
		expect(keepKindling(open, null, undefined, true)).toBeUndefined();
	});

	it("keeps the last snapshot when the last step was tended, so the final tend plays", () => {
		const kept = keepKindling(
			open,
			null,
			ended({ a: "done", b: "done", c: "done" }),
			false
		);
		expect(kept?.closed).toBe(true);
		expect(kept?.view.twigs.map((t) => t.state)).toEqual([
			"done",
			"done",
			"done",
		]);
		// It closed while Today was behind the kindling screen; it stays through the blur.
		expect(kept?.seen).toBe(false);
		expect(keepKindling(kept ?? null, null, undefined, false)).toBeUndefined();
	});

	it("drops a kindling put out, and never tends it", () => {
		expect(
			keepKindling(open, null, ended({ c: "pending" }, false), true)
		).toBeNull();
	});

	it("drops it when Plus lapses (no outcome) or another kindling took its place", () => {
		expect(keepKindling(open, null, null, true)).toBeNull();
		expect(keepKindling(open, null, ended({}, true, "k2"), true)).toBeNull();
	});

	it("drops it when the last step was passed by: completed, but nothing to tend", () => {
		expect(keepKindling(open, null, ended({ c: "skipped" }), true)).toBeNull();
	});

	it("keeps a passed-by step unlit beside the one tended", () => {
		const kept = keepKindling(
			{
				closed: false,
				seen: false,
				view: {
					id: "k1",
					twigs: [
						twig("done", "a"),
						twig("pending", "b"),
						twig("pending", "c"),
					],
				},
			},
			null,
			ended({ b: "done", c: "skipped" }),
			true
		);
		expect(kept?.closed).toBe(true);
		expect(kept?.view.twigs.map((t) => t.state)).toEqual([
			"done",
			"done",
			"skipped",
		]);
	});

	it("drops it on the next blur once Today has shown it", () => {
		const closed = keepKindling(open, null, ended({ c: "done" }), false);
		const seen = keepKindling(closed ?? null, null, undefined, true);
		expect(seen?.seen).toBe(true);
		expect(keepKindling(seen ?? null, null, undefined, true)).toBeUndefined();
		expect(keepKindling(seen ?? null, null, undefined, false)).toBeNull();
	});

	it("takes a new kindling over the kept one", () => {
		const closed = keepKindling(open, null, ended({ c: "done" }), true);
		const fresh = { id: "k2", twigs: [twig("pending", "d")] };
		expect(keepKindling(closed ?? null, fresh, undefined, true)).toEqual({
			closed: false,
			seen: false,
			view: fresh,
		});
	});
});

describe("kindlingOutcome", () => {
	const dismissed: Parameters<typeof kindlingOutcome>[0] = {
		_id: "k1" as Id<"paths">,
		status: "dismissed",
		twigs: [{ _id: "a" as Id<"path_steps">, state: "pending" }],
	};

	it("reads how the latest kindling ended", () => {
		expect(kindlingOutcome(null)).toBeNull();
		expect(kindlingOutcome(dismissed)).toEqual({
			completed: false,
			id: "k1",
			states: { a: "pending" },
		});
	});
});
