import { describe, expect, it } from "vitest";
import {
	type ConversationStatus,
	daysUntil,
	declineCooldownActive,
	hasSpoken,
	rateCtaState,
	resolveMessageIdentity,
} from "./chat-rules";

describe("rateCtaState", () => {
	const cases: {
		canRate: boolean;
		myRating?: number;
		expected: "hidden" | "prompt" | "rated";
	}[] = [
		{ canRate: true, expected: "prompt", myRating: undefined },
		{ canRate: true, expected: "rated", myRating: 4 },
		{ canRate: false, expected: "hidden", myRating: undefined },
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

	const cases: { inMs?: number; expected: boolean; label: string }[] = [
		{ expected: false, label: "no cooldown on the row" },
		{ expected: true, inMs: 1000, label: "a second left" },
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

	const cases: { inMs: number; expected: number; label: string }[] = [
		{ expected: 7, inMs: 7 * DAY, label: "a full week out" },
		{ expected: 7, inMs: 6.5 * DAY, label: "part-days round up, never down" },
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
	const cases: {
		status: ConversationStatus;
		reason?: "declined" | "expired" | "blocked" | "xolacer_left";
		expected: boolean;
		label?: string;
	}[] = [
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

describe("resolveMessageIdentity", () => {
	const THEM = "profile_them";

	const SOMEONE_ELSE = "profile_system";

	type Conversation = {
		counterpartProfileId: string;
		counterpartName: string;
		counterpartPhotoUrl?: string;
	};

	const asSeeker: Conversation = {
		counterpartName: "Maya",
		counterpartPhotoUrl: "https://cdn/maya.jpg",
		counterpartProfileId: THEM,
	};
	const asXolacer: Conversation = {
		counterpartName: "Camper 4F2A",
		counterpartPhotoUrl: "https://cdn/avatar-fox.png",
		counterpartProfileId: THEM,
	};

	const cases: {
		sender?: string;
		conversation: Conversation;
		expected: { name: string; image?: string } | null;
		label: string;
	}[] = [
		{
			conversation: asSeeker,
			expected: null,
			label: "no sender id, nothing to override",
			sender: undefined,
		},
		{
			conversation: asSeeker,
			expected: null,
			label: "a sender who is neither party keeps the SDK identity",
			sender: SOMEONE_ELSE,
		},
		{
			conversation: asSeeker,
			expected: { image: "https://cdn/maya.jpg", name: "Maya" },
			label: "counterpart in a seeker-role conversation is the real xolacer",
			sender: THEM,
		},
		{
			conversation: {
				...asXolacer,
				displayName: "Maya",
				photoUrl: "https://cdn/maya.jpg",
				xolacerActive: true,
				xolacerComplete: true,
			} as Conversation,
			expected: { image: "https://cdn/avatar-fox.png", name: "Camper 4F2A" },
			label: "counterpart is also an active xolacer elsewhere: still anonymous",
			sender: THEM,
		},
	];

	for (const c of cases) {
		it(`${c.label}: sender=${c.sender}`, () => {
			expect(resolveMessageIdentity(c.sender, c.conversation)).toEqual(
				c.expected
			);
		});
	}
});
