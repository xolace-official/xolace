import { ConvexError } from "convex/values";
import { describe, expect, it } from "vitest";
import {
	type DemoAction,
	type DemoState,
	demoReducer,
	finishedBy,
	initialDemoState,
	refusalOf,
} from "@/features/intake/v2/plus/talk-demo/demo-machine";

const run = (state: DemoState, ...actions: DemoAction[]) =>
	actions.reduce(demoReducer, state);

const open = () => run(initialDemoState(), { type: "OPENED" });

const RESOURCE = {
	label: "Crisis line",
	priority: 1,
	source: "crisis_line",
	type: "phone",
	value: "988",
} as const;

describe("opening", () => {
	it("waits on the server, then shows Flux's line in Wren's voice", () => {
		expect(initialDemoState()).toMatchObject({
			phase: "opening",
			voice: "wren",
		});
		expect(open().phase).toBe("intro");
	});

	it("says the demo was already tried when the server refuses it as used", () => {
		expect(
			run(initialDemoState(), { reason: "used", type: "OPEN_REFUSED" }).phase
		).toBe("used");
	});

	it("fails plainly on any other refusal", () => {
		expect(
			run(initialDemoState(), { reason: "error", type: "OPEN_REFUSED" }).phase
		).toBe("failed");
	});
});

describe("intro", () => {
	it("switches voice", () => {
		expect(run(open(), { type: "PICK_VOICE", voice: "ash" }).voice).toBe("ash");
	});

	it("keeps the voice once the person has spoken", () => {
		const state = run(
			open(),
			{ type: "TRY" },
			{ transcript: "work again", type: "HEARD" },
			{ type: "PICK_VOICE", voice: "ash" }
		);
		expect(state.voice).toBe("wren");
	});

	it("listens on Try me", () => {
		expect(run(open(), { type: "TRY" }).phase).toBe("listening");
	});
});

describe("listening", () => {
	it("sends what was heard, trimmed", () => {
		expect(
			run(
				open(),
				{ type: "TRY" },
				{ transcript: "  my manager took credit again ", type: "HEARD" }
			)
		).toMatchObject({
			line: "my manager took credit again",
			mode: "voice",
			phase: "thinking",
		});
	});

	it("goes back to the intro when nothing was heard", () => {
		expect(
			run(open(), { type: "TRY" }, { transcript: "   ", type: "HEARD" }).phase
		).toBe("intro");
	});

	it("falls back to typing when the mic is off, and stays there", () => {
		const typing = run(open(), { type: "TRY" }, { type: "MIC_FAILED" });
		expect(typing.phase).toBe("typing");
		expect(run(typing, { type: "BACK" }, { type: "TRY" }).phase).toBe("typing");
	});
});

describe("typing", () => {
	const typing = () => run(open(), { type: "TRY" }, { type: "MIC_FAILED" });

	it("sends the draft", () => {
		expect(
			run(typing(), { text: "work again", type: "DRAFT" }, { type: "SEND" })
		).toMatchObject({ line: "work again", mode: "type", phase: "thinking" });
	});

	it("won't send a blank draft", () => {
		expect(
			run(typing(), { text: "  ", type: "DRAFT" }, { type: "SEND" }).phase
		).toBe("typing");
	});
});

describe("the reply", () => {
	const thinking = () =>
		run(open(), { type: "TRY" }, { transcript: "work again", type: "HEARD" });

	it("speaks Flux's question, then offers the way on", () => {
		const replying = run(thinking(), {
			reply: { audioUrl: "https://a/1.mp3", route: "reply", text: "Why?" },
			type: "REPLIED",
		});
		expect(replying).toMatchObject({
			audioUrl: "https://a/1.mp3",
			phase: "reply",
			reply: "Why?",
		});
		const done = run(replying, { type: "SAID" });
		expect(done.phase).toBe("done");
		expect(finishedBy(done)).toBe("reply");
	});

	it("ends on crisis support when the safeguard trips", () => {
		const state = run(thinking(), {
			reply: {
				resources: [RESOURCE],
				route: "safety",
				safeguardLevel: "crisis",
			},
			type: "REPLIED",
		});
		expect(state).toMatchObject({ phase: "safety", resources: [RESOURCE] });
		expect(finishedBy(state)).toBe("safety");
	});

	it("says it was already tried when the turn was taken", () => {
		expect(
			run(thinking(), { reason: "used", type: "REPLY_REFUSED" }).phase
		).toBe("used");
	});

	it("fails plainly on any other error", () => {
		expect(
			run(thinking(), { reason: "error", type: "REPLY_REFUSED" }).phase
		).toBe("failed");
	});

	it("says the demo timed out when it sat past its cap", () => {
		expect(
			run(thinking(), { reason: "expired", type: "REPLY_REFUSED" }).phase
		).toBe("expired");
	});

	it("is finished as soon as the reply arrives, said or not", () => {
		expect(finishedBy(thinking())).toBeNull();
		expect(
			finishedBy(
				run(thinking(), {
					reply: { audioUrl: null, route: "reply", text: "Why?" },
					type: "REPLIED",
				})
			)
		).toBe("reply");
	});
});

describe("refusalOf", () => {
	it("reads a spent demo or turn as used", () => {
		expect(refusalOf(new ConvexError({ code: "demo_used" }))).toBe("used");
		expect(refusalOf(new ConvexError({ code: "turn_taken" }))).toBe("used");
	});

	it("reads a timed-out demo as expired", () => {
		expect(refusalOf(new ConvexError({ code: "demo_expired" }))).toBe(
			"expired"
		);
	});

	it("reads anything else as an error", () => {
		expect(refusalOf(new ConvexError({ code: "demo_not_open" }))).toBe("error");
		expect(refusalOf(new Error("offline"))).toBe("error");
	});
});
