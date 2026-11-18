import { describe, expect, it } from "vitest";
import { SOCIAL } from "@/features/settings/follow/copy";
import {
	FEEDBACK_NOTE,
	FOLLOW_LIMITED,
	FOLLOW_SENT,
	FOLLOW_TOP,
	FOLLOW_TYPING,
} from "@/features/settings/follow/dev/fixtures";
import {
	canSendFeedback,
	feedbackMailto,
	feedbackView,
	isLimited,
	outside,
	reviewRow,
	reviewUrl,
	sendErrorMessage,
} from "@/features/settings/follow/follow-model";

describe("feedbackView", () => {
	it("keeps Send dim until there are words (render 34's dialog, empty)", () => {
		const view = feedbackView({ ...FOLLOW_TOP.feedback, open: true });
		expect(view).toEqual({
			count: "0 / 1000",
			editable: true,
			limited: false,
			ok: "Send",
			okDisabled: true,
		});
	});

	it("enables Send with a note and counts it (render 36)", () => {
		const view = feedbackView(FOLLOW_TYPING.feedback);
		expect(view.okDisabled).toBe(false);
		expect(view.count).toBe(`${FEEDBACK_NOTE.length} / 1000`);
	});

	it("doesn't count spaces alone as a note", () => {
		const view = feedbackView({ ...FOLLOW_TYPING.feedback, draft: "   " });
		expect(view.okDisabled).toBe(true);
	});

	it("locks the field and Send once today's note is sent (render 37)", () => {
		const view = feedbackView(FOLLOW_LIMITED.feedback);
		expect(view.limited).toBe(true);
		expect(view.editable).toBe(false);
		expect(view.okDisabled).toBe(true);
	});

	it("shows Sending... and keeps the button solid while it goes", () => {
		const view = feedbackView({ ...FOLLOW_TYPING.feedback, phase: "busy" });
		expect(view.ok).toBe("Sending...");
		expect(view.okDisabled).toBe(false);
		expect(view.editable).toBe(false);
	});

	it("shows Sent. without the limited line, though the limit has flipped", () => {
		const view = feedbackView(FOLLOW_SENT.feedback);
		expect(view.ok).toBe("Sent.");
		expect(view.limited).toBe(false);
	});
});

describe("canSendFeedback", () => {
	it("lets a note go while the limit loads (production; the backend still refuses)", () => {
		expect(
			canSendFeedback({ canSubmit: undefined, draft: "hi", phase: "idle" })
		).toBe(true);
		expect(isLimited({ canSubmit: undefined, phase: "idle" })).toBe(false);
	});

	it("never sends twice", () => {
		expect(
			canSendFeedback({ canSubmit: true, draft: "hi", phase: "busy" })
		).toBe(false);
		expect(
			canSendFeedback({ canSubmit: true, draft: "hi", phase: "sent" })
		).toBe(false);
	});
});

describe("sendErrorMessage", () => {
	it("strips Convex's wrapping, as production did", () => {
		const e = new Error(
			"[CONVEX M(feedback:submit)] Uncaught Error: Rate limited\n    at handler"
		);
		expect(sendErrorMessage(e)).toBe("Rate limited");
	});

	it("keeps a plain message and names anything else", () => {
		expect(sendErrorMessage(new Error("Offline"))).toBe("Offline");
		expect(sendErrorMessage("nope")).toBe("Something went wrong");
	});
});

describe("links", () => {
	it("mails feedback with production's subject and starter body", () => {
		expect(feedbackMailto()).toBe(
			"mailto:feedback@xolaceinc.com?subject=Xolace%20Feedback&body=Hi%20Xolace%20team%2C%0A%0AI%20have%20some%20feedback%3A%0A%0A%5BYour%20feedback%20here%5D%0A%0AThanks!"
		);
	});

	it("reviews on each platform's store", () => {
		expect(reviewUrl("ios")).toBe(
			"https://apps.apple.com/app/apple-store/id6761601429?action=write-review"
		);
		expect(reviewUrl("android")).toBe(
			"https://play.google.com/store/apps/details?id=com.xolaceincorg.xolace&showAllReviews=true"
		);
	});

	it("reads the review row without the 🎁", () => {
		expect(reviewRow("ios")).toEqual({
			a11y: "Leave us a review, opens the App Store",
			sub: "Opens the App Store",
		});
		expect(reviewRow("android").a11y).toBe(
			"Leave us a review, opens the Play Store"
		);
	});

	it("says a row leaves the app", () => {
		expect(outside("Website, xolaceinc.com")).toBe(
			"Website, xolaceinc.com, opens outside Xolace"
		);
	});

	it("keeps production's six places in its order", () => {
		expect(SOCIAL.map((s) => s.label)).toEqual([
			"Website",
			"Instagram",
			"TikTok",
			"LinkedIn",
			"Snapchat",
			"WhatsApp Channel",
		]);
	});
});
