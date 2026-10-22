import { describe, expect, it } from "vitest";
import type { ConversationList } from "./chats-list";
import { rowPresentation } from "./conversation-row-labels";

type Conversation = ConversationList[number];

const row = (over: Partial<Conversation>): Conversation =>
	({
		archived: false,
		counterpartName: "Ama",
		counterpartPresent: false,
		counterpartProfileId: "x1",
		id: "c1",
		requestedAt: 0,
		role: "user",
		status: "resting",
		xolacerProfileId: "x1",
		...over,
	}) as Conversation;

describe("resting copy branches on restingReason", () => {
	it("reads as a wrap-up when the xolacer closed it", () => {
		const seeker = rowPresentation(row({ restingReason: "manual" }));
		expect(seeker.chip?.label).toBe("Wrapped up");
		expect(seeker.statusLine).toContain("Ama wrapped this up");
		expect(
			rowPresentation(row({ restingReason: "manual", role: "xolacer" }))
				.statusLine
		).toContain("You wrapped this up");
	});

	it("reads as gone quiet for a swept row and for one predating the field", () => {
		for (const conversation of [row({ restingReason: "quiet" }), row({})]) {
			const presentation = rowPresentation(conversation);
			expect(presentation.chip?.label).toBe("Resting");
			expect(presentation.statusLine).toBe(
				"Gone quiet, pick it back up anytime"
			);
		}
	});
});

describe("rowPresentation", () => {
	it("leaves an open row as a single line", () => {
		const open = rowPresentation(row({ status: "open" }));
		expect(open.chip).toBeNull();
		expect(open.statusLine).toBeNull();
		expect(open.requestDot).toBe(false);
	});

	it("gives every non-open status both a pill and a status line", () => {
		const rows = [
			row({ status: "requested" }),
			row({ role: "xolacer", status: "requested" }),
			row({ status: "resting" }),
			row({ restingReason: "manual", status: "resting" }),
			row({ status: "closed" }),
			row({ closedReason: "declined", status: "closed" }),
			row({ closedReason: "expired", status: "closed" }),
		];
		for (const conversation of rows) {
			const presentation = rowPresentation(conversation);
			expect(presentation.chip?.label).toBeTruthy();
			expect(presentation.statusLine).toBeTruthy();
		}
	});

	it("dots a xolacer's incoming request but never a seeker's wait", () => {
		const incoming = rowPresentation(
			row({ role: "xolacer", status: "requested" })
		);
		expect(incoming.chip?.label).toBe("New request");
		expect(incoming.requestDot).toBe(true);

		const waiting = rowPresentation(row({ status: "requested" }));
		expect(waiting.chip?.label).toBe("Waiting");
		expect(waiting.requestDot).toBe(false);
	});

	it("says when a suggestion-origin request arrived, on the status line", () => {
		expect(
			rowPresentation(
				row({ origin: "suggestion", role: "xolacer", status: "requested" })
			).statusLine
		).toBe("Just after a session");
		expect(
			rowPresentation(
				row({ origin: "direct", role: "xolacer", status: "requested" })
			).statusLine
		).not.toBe("Just after a session");
		// Freshness is the xolacer's read on their own inbox, never the seeker's.
		expect(
			rowPresentation(row({ origin: "suggestion", status: "requested" }))
				.statusLine
		).toContain("Request sent");
	});

	it("mutes the avatar on closed and nothing else", () => {
		expect(rowPresentation(row({ status: "closed" })).mutedAvatar).toBe(true);
		for (const conversation of [
			row({ status: "open" }),
			row({ status: "requested" }),
			row({ status: "resting" }),
		]) {
			expect(rowPresentation(conversation).mutedAvatar).toBe(false);
		}
	});
});
