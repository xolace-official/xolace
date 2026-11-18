import { describe, expect, it } from "vitest";
import {
	type ConversationStatus,
	daysUntil,
	declineCooldownActive,
	hasSpoken,
	rateCtaState,
} from "./chat-rules";

describe("rateCtaState", () => {
	// canRate | myRating → what the CTA does
	const cases: {
		canRate: boolean;
		myRating?: number;
		expected: "hidden" | "prompt" | "rated";
	}[] = [
		{ canRate: true, expected: "prompt", myRating: undefined },
		{ canRate: true, expected: "rated", myRating: 4 },
		{ canRate: false, expected: "hidden", myRating: undefined },
		// Rated, then the conversation stopped being rateable (a block): the link
		// goes away even for someone who already used it.
		{ canRate: false, expected: "hidden", myRating: 5 },
	];

	for (const c of cases) {
		it(`canRate=${c.canRate} myRating=${c.myRating} → ${c.expected}`, () => {
			expect(rateCtaState({ canRate: c.canRate, myRating: c.myRating })).toBe(
				c.expected
			);
		});
	}
});

describe("declineCooldownActive", () => {
	const DAY = 86_400_000;

	// server-computed retryAvailableAt → is the door still shut?
	const cases: { inMs?: number; expected: boolean; label: string }[] = [
		{ expected: false, label: "no cooldown on the row" },
		{ expected: true, inMs: 1000, label: "a second left" },
		// The dead-end this guards: a stale, already-past timestamp arrives from the
		// reactive query's cache and would disable the CTA forever.
		{ expected: false, inMs: 0, label: "exactly now" },
		{ expected: false, inMs: -30 * DAY, label: "long expired, still cached" },
	];

	for (const c of cases) {
		it(`${c.label} → ${c.expected}`, () => {
			expect(
				declineCooldownActive(
					c.inMs === undefined ? undefined : Date.now() + c.inMs
				)
			).toBe(c.expected);
		});
	}
});

describe("daysUntil", () => {
	const DAY = 86_400_000;

	// ms from now → whole days the sentence says to wait
	const cases: { inMs: number; expected: number; label: string }[] = [
		{ expected: 7, inMs: 7 * DAY, label: "a full week out" },
		{ expected: 7, inMs: 6.5 * DAY, label: "part-days round up, never down" },
		// The floor: hours left must never read as "ask again in 0 days", which
		// describes a wait that is already over.
		{ expected: 1, inMs: 3_600_000, label: "an hour left" },
		{ expected: 1, inMs: 0, label: "already elapsed" },
	];

	for (const c of cases) {
		it(`${c.label} → ${c.expected}`, () => {
			expect(daysUntil(Date.now() + c.inMs)).toBe(c.expected);
		});
	}
});

describe("hasSpoken", () => {
	// status | closedReason → did these two ever exchange a message?
	const cases: {
		status: ConversationStatus;
		reason?: "declined" | "expired" | "blocked" | "xolacer_left";
		expected: boolean;
		label?: string;
	}[] = [
		// Never accepted — no channel was ever created, so nothing was written.
		{ expected: false, status: "requested" },
		{
			expected: false,
			label: "declined before accept",
			reason: "declined",
			status: "closed",
		},
		{
			expected: false,
			label: "expired before accept",
			reason: "expired",
			status: "closed",
		},
		// Accepted at some point, so there is history worth promising to keep.
		{ expected: true, status: "open" },
		{
			expected: true,
			label: "left after accepting",
			reason: "xolacer_left",
			status: "closed",
		},
		{ expected: true, label: "closed with no reason", status: "closed" },
	];

	for (const c of cases) {
		const name = `${c.label ? `${c.label}: ` : ""}status=${c.status} reason=${c.reason} → ${c.expected}`;
		it(name, () => {
			expect(hasSpoken({ closedReason: c.reason, status: c.status })).toBe(
				c.expected
			);
		});
	}
});
