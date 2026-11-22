import { ConvexError } from "convex/values";
import { describe, expect, it } from "vitest";
import { FEEDBACK_COPY } from "./copy";
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

const PRODUCTION_MESSAGE =
	"[CONVEX M(productFeedback:submit)] [Request ID: abc123] Server Error";

describe("errorMessageOf", () => {
	it("gives each kind its own limit copy when production scrubs the message", () => {
		const limited = new ConvexError({ code: "rate_limited", kind: "concern" });
		limited.message = PRODUCTION_MESSAGE;
		expect(errorMessageOf(limited, "concern")).toBe(
			FEEDBACK_COPY.report.concern.rateLimited
		);
		expect(errorMessageOf(limited, "bug")).toBe(
			FEEDBACK_COPY.report.bug.rateLimited
		);
	});

	it("never shows production's scrubbed message", () => {
		expect(errorMessageOf(new Error(PRODUCTION_MESSAGE), "bug")).toBe(
			"Something went wrong"
		);
	});

	it("unwraps the message of a server from before the codes", () => {
		expect(
			errorMessageOf(
				new Error("[CONVEX] Uncaught Error: Too long\n at x"),
				"idea"
			)
		).toBe("Too long");
	});

	it("falls back for a non-error", () => {
		expect(errorMessageOf("x", "bug")).toBe("Something went wrong");
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
