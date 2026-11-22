import { describe, expect, it } from "vitest";
import { COPY } from "./copy";
import {
	type ActiveKindling,
	cardText,
	caught,
	effectiveStates,
	followStates,
	freshTends,
	heldOn,
	keptView,
	type LatestKindling,
	type LocalStates,
	progressText,
	restingCard,
	stopLabel,
	suggestionOf,
	type TrailView,
	trailView,
} from "./kindling-model";

type ServerTwig = ActiveKindling["twigs"][number];

const twig = (
	id: string,
	kind: string,
	state: ServerTwig["state"],
	extra?: Partial<ServerTwig>
) =>
	({
		_id: id,
		actionType: `${kind}_x`,
		kind,
		order: 0,
		params: {},
		state,
		why: "Because — it helps",
		...extra,
	}) as unknown as ServerTwig;

const active = (twigs: ServerTwig[]): ActiveKindling =>
	({
		_id: "path1",
		generatedAt: 0,
		sessionId: "s1",
		twigs,
	}) as unknown as ActiveKindling;

const FOUR = active([
	twig("a", "breathing", "pending"),
	twig("b", "audio", "pending", { actionType: "audio_topic_sleep" }),
	twig("c", "bridge", "pending", { title: "  Text Sam  " }),
	twig("d", "try", "pending", { detail: " Walk outside " }),
]);
const NONE_LOCAL: LocalStates = {
	skipped: new Set(),
	tended: new Set(),
	undo: null,
};

describe("trailView", () => {
	it("is null with no kindling or no twigs", () => {
		expect(trailView(null)).toBeNull();
		expect(trailView(active([]))).toBeNull();
	});

	it("maps the server's twigs to stops and cards", () => {
		const v = trailView(FOUR) as TrailView;
		expect(v.states).toEqual(["wait", "wait", "wait", "wait"]);
		expect(v.twigs[0]?.title).toBe("Sit with this");
		expect(v.twigs[0]?.why).toBe("Because, it helps");
		expect(v.twigs[1]?.browsable).toBe(true);
		expect(v.twigs[0]?.browsable).toBe(false);
		expect(v.twigs[2]?.title).toBe("Text Sam");
		expect(v.twigs[3]?.detail).toBe("Walk outside");
		expect(v.twigs[3]?.again).toBeNull();
	});

	it("gives an unknown kind the fallback look", () => {
		const v = trailView(active([twig("z", "dance", "pending")])) as TrailView;
		expect(v.twigs[0]?.action).toBe("Open");
	});
});

describe("keptView", () => {
	const kept = trailView(FOUR);
	const latest = (status: "active" | "completed" | "dismissed", id = "path1") =>
		({
			_id: id,
			status,
			twigs: [
				{ _id: "a", state: "done" },
				{ _id: "b", state: "skipped" },
				{ _id: "c", state: "done" },
				{ _id: "d", state: "done" },
			],
		}) as unknown as LatestKindling;

	it("follows the live kindling", () => {
		expect(keptView(FOUR, null, undefined)?.id).toBe("path1");
	});

	it("keeps what it had while the read reloads", () => {
		expect(keptView(undefined, kept, undefined)).toBe(kept);
		expect(keptView(undefined, null, undefined)).toBeUndefined();
	});

	it("is none when there never was one", () => {
		expect(keptView(null, null, undefined)).toBeNull();
	});

	it("keeps the last one, finished, once the server completes it", () => {
		expect(keptView(null, kept, undefined)).toBe(kept);
		expect(keptView(null, kept, latest("completed"))?.states).toEqual([
			"done",
			"passed",
			"done",
			"done",
		]);
	});

	it("lets it go when it was put out or replaced", () => {
		expect(keptView(null, kept, latest("dismissed"))).toBeNull();
		expect(keptView(null, kept, latest("completed", "other"))).toBeNull();
		expect(keptView(null, kept, null)).toBeNull();
	});
});

describe("states", () => {
	const v = trailView(FOUR) as TrailView;

	it("puts this visit's changes on the server's", () => {
		const local: LocalStates = {
			skipped: new Set(["b"]),
			tended: new Set(["c"]),
			undo: "a",
		};
		expect(effectiveStates(v, local)).toEqual([
			"undo",
			"passed",
			"done",
			"wait",
		]);
	});

	it("lets the server's word win", () => {
		const done = { ...v, states: ["done", "wait", "wait", "wait"] as const };
		expect(
			effectiveStates(
				{ ...done, states: [...done.states] },
				{ ...NONE_LOCAL, undo: "a" }
			)
		).toEqual(["done", "wait", "wait", "wait"]);
	});

	it("holds a fresh tend back until it plays", () => {
		const shown = ["wait", "wait", "passed", "wait"] as const;
		const now = ["done", "wait", "passed", "done"] as const;
		expect(followStates(shown, now)).toEqual([
			"wait",
			"wait",
			"passed",
			"wait",
		]);
		expect(freshTends(shown, now)).toEqual([0, 3]);
		expect(followStates(["done"], ["done"])).toEqual(["done"]);
	});

	it("rests the card on the suggestion, else the all card", () => {
		expect(restingCard(["done", "passed", "wait", "wait"])).toBe(2);
		expect(restingCard(["done", "passed"])).toBe(2);
		expect(suggestionOf(["done", "undo", "wait"])).toBe(1);
	});

	it("catches only with something tended and nothing waiting", () => {
		expect(caught(["done", "passed"])).toBe(true);
		expect(caught(["passed", "passed"])).toBe(false);
		expect(caught(["done", "wait"])).toBe(false);
		expect(caught([])).toBe(false);
	});

	it("doesn't catch while an Undo still shows: only once the skip is sent", () => {
		expect(caught(["done", "undo"])).toBe(false);
		expect(caught(["done", "passed"])).toBe(true);
	});
});

describe("progressText", () => {
	it("counts tends and passes", () => {
		expect(progressText(["done", "passed", "wait", "wait"]).text).toBe(
			"1 of 4 tended · 1 passed by"
		);
	});

	it("says all once every twig is tended", () => {
		expect(progressText(["done", "done"])).toEqual({
			all: true,
			text: "All 2 tended",
		});
	});

	it("drops the passes once the fire has caught", () => {
		expect(progressText(["done", "passed"]).text).toBe("1 of 2 tended");
	});
});

describe("heldOn", () => {
	const at = (d: number, h = 12) => new Date(2026, 10, d, h).getTime();

	it("names an earlier day this week", () => {
		expect(heldOn(at(17), at(19))).toBe("Tuesday");
	});

	it("says the last session today or over a week ago", () => {
		expect(heldOn(at(19, 1), at(19, 23))).toBe(COPY.lastSession);
		expect(heldOn(at(5), at(19))).toBe(COPY.lastSession);
	});
});

describe("cardText", () => {
	const v = trailView(FOUR) as TrailView;

	it("shows a waiting twig in violet", () => {
		const t = cardText(v.twigs, ["wait", "wait", "wait", "wait"], 0);
		expect(t).toMatchObject({
			row: "wait",
			title: "Sit with this",
			tone: "violet",
		});
	});

	it("marks tended and passed twigs", () => {
		expect(cardText(v.twigs, ["done", "wait", "wait", "wait"], 0).tone).toBe(
			"ember"
		);
		expect(cardText(v.twigs, ["undo", "wait", "wait", "wait"], 0).row).toBe(
			"undo"
		);
		expect(cardText(v.twigs, ["passed", "wait", "wait", "wait"], 0).tone).toBe(
			"quiet"
		);
	});

	it("is the all card past the last twig", () => {
		const all = cardText(v.twigs, ["done", "passed", "done", "done"], 4);
		expect(all).toMatchObject({
			eyebrow: COPY.all.eyebrowSome,
			row: "all",
			title: COPY.all.title,
		});
		const none = cardText(v.twigs, ["passed", "passed", "passed", "passed"], 4);
		expect(none).toMatchObject({
			eyebrow: COPY.all.eyebrowNone,
			title: COPY.all.titleNone,
		});
	});
});

describe("stopLabel", () => {
	const v = trailView(FOUR) as TrailView;
	const first = v.twigs[0];

	it("reads the stop's place and state", () => {
		if (!first) {
			throw new Error("no twig");
		}
		expect(stopLabel(first, 0, 4, "wait", true)).toBe(
			COPY.a11y.stop(
				first.title,
				first.cardEyebrow,
				1,
				4,
				COPY.a11y.waiting,
				true
			)
		);
		expect(stopLabel(first, 0, 4, "undo", true)).toBe(
			COPY.a11y.stop(
				first.title,
				first.cardEyebrow,
				1,
				4,
				COPY.a11y.passed,
				false
			)
		);
	});
});
