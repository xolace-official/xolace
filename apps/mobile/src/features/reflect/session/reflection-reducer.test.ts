import { describe, expect, it } from "vitest";
import {
	initialState,
	reducer,
	timedReducer,
} from "@/features/reflect/session/reflection-reducer";
import type {
	ReflectionAction,
	ReflectionState,
} from "@/features/reflect/session/types";

describe("reducer — draft retention", () => {
	const withDraft = {
		...initialState,
		entryText: "I keep",
		screen: "typing" as const,
	};

	it("keeps the entry text when the composer is dismissed", () => {
		const next = reducer(withDraft, { type: "DISMISS_TYPING" });
		expect(next.screen).toBe("idle");
		expect(next.entryText).toBe("I keep");
	});

	it("clears the entry text on an explicit discard", () => {
		expect(reducer(withDraft, { type: "DISCARD_DRAFT" }).entryText).toBe("");
	});

	it("still clears the entry text on RESET", () => {
		expect(reducer(withDraft, { type: "RESET" }).entryText).toBe("");
	});
});

describe("reducer — session errors", () => {
	it("keeps the error code beside the message", () => {
		const next = reducer(initialState, {
			code: "reflection_rate_limited",
			message: "Slow down a little.",
			type: "SESSION_ERROR",
		});
		expect(next.screen).toBe("error");
		expect(next.errorCode).toBe("reflection_rate_limited");
		expect(next.errorMessage).toBe("Slow down a little.");
	});

	it("has no code when an older session only carries a message", () => {
		const next = reducer(
			{ ...initialState, errorCode: "content_policy_violation" },
			{ message: "Something went wrong.", type: "SESSION_ERROR" }
		);
		expect(next.errorCode).toBeNull();
	});

	it("forgets the code on RESET", () => {
		const errored = reducer(initialState, {
			code: "content_policy_violation",
			message: "x",
			type: "SESSION_ERROR",
		});
		expect(reducer(errored, { type: "RESET" }).errorCode).toBeNull();
	});
});

describe("timedReducer — the typing clock", () => {
	const run = (steps: [ReflectionAction, number][]): ReflectionState =>
		steps.reduce(
			(state, [action, at]) => timedReducer(state, { ...action, at }),
			initialState
		);

	it("starts when writing starts, and only then", () => {
		const state = run([
			[{ type: "TAP_INPUT" }, 1000],
			[{ text: "I", type: "TEXT_CHANGE" }, 1500],
			[{ type: "DISMISS_TYPING" }, 2000],
			[{ text: "I keep", type: "TEXT_CHANGE" }, 3000],
		]);
		expect(state.typing.startedAt).toBe(1000);
		expect(state.typing.froze).toBe(false);
		expect(state.typing.frozeMs).toBeUndefined();
	});

	it("adds up each time the nudge held the writing", () => {
		const state = run([
			[{ type: "TAP_INPUT" }, 0],
			[{ type: "PAUSE_TIMEOUT" }, 8000],
			[{ type: "RESUME_TYPING" }, 9000],
			[{ type: "PAUSE_TIMEOUT" }, 20_000],
			[{ text: "more", type: "TEXT_CHANGE" }, 22_500],
		]);
		expect(state.typing.froze).toBe(true);
		expect(state.typing.frozeMs).toBe(3500);
		expect(state.typing.frozeAt).toBeNull();
	});

	it("keeps an open freeze when the writing is sent from the nudge", () => {
		const state = run([
			[{ type: "TAP_INPUT" }, 0],
			[{ type: "PAUSE_TIMEOUT" }, 8000],
			[{ type: "SUBMIT" }, 9000],
		]);
		expect(state.typing.froze).toBe(true);
		expect(state.typing.frozeMs).toBeUndefined();
		expect(state.typing.startedAt).toBe(0);
	});

	it("is cleared on RESET", () => {
		const state = run([
			[{ type: "TAP_INPUT" }, 0],
			[{ type: "PAUSE_TIMEOUT" }, 8000],
			[{ type: "RESET" }, 9000],
		]);
		expect(state.typing).toEqual(initialState.typing);
	});

	it("leaves the state untouched when the screen holds", () => {
		const typing = run([[{ type: "TAP_INPUT" }, 0]]);
		const next = timedReducer(typing, {
			at: 5,
			text: "a",
			type: "TEXT_CHANGE",
		});
		expect(next.typing).toBe(typing.typing);
	});
});
