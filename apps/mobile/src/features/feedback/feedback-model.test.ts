import { describe, expect, it } from "vitest";
import {
	concernParams,
	errorMessageOf,
	feedbackStartOf,
	reportView,
} from "./feedback-model";

describe("feedbackStartOf", () => {
	it("opens the menu by default", () => {
		expect(feedbackStartOf({})).toEqual({ step: "menu" });
		expect(feedbackStartOf({ kind: "nope" })).toEqual({ step: "menu" });
	});

	it("opens a bug or an idea on its form", () => {
		expect(feedbackStartOf({ kind: "idea" })).toEqual({
			kind: "idea",
			step: "report",
		});
	});

	it("round-trips a concern's subject", () => {
		const subject = {
			conversationId: "c1" as never,
			name: "Ama",
			profileId: "p1" as never,
		};
		expect(feedbackStartOf(concernParams(subject, "/chat/c1"))).toEqual({
			kind: "concern",
			step: "report",
			subject,
		});
	});

	it("drops a concern's subject when the params are partial", () => {
		expect(feedbackStartOf({ kind: "concern", name: "Ama" })).toEqual({
			kind: "concern",
			step: "report",
			subject: undefined,
		});
	});
});

describe("errorMessageOf", () => {
	it("unwraps Convex's message", () => {
		expect(
			errorMessageOf(new Error("[CONVEX] Uncaught Error: Too long\n at x"))
		).toBe("Too long");
	});

	it("falls back for a non-error", () => {
		expect(errorMessageOf("x")).toBe("Something went wrong");
	});
});

describe("reportView", () => {
	it("counts and gates Send", () => {
		expect(reportView({ limited: false, saving: false, text: "" })).toEqual({
			count: "0 / 1000",
			send: "Send",
			sendDisabled: true,
		});
		expect(
			reportView({ limited: false, saving: false, text: "hi" }).sendDisabled
		).toBe(false);
		expect(reportView({ limited: true, saving: false, text: "hi" })).toEqual(
			expect.objectContaining({ sendDisabled: true })
		);
		expect(reportView({ limited: false, saving: true, text: "hi" })).toEqual(
			expect.objectContaining({ send: "Sending...", sendDisabled: true })
		);
	});
});
