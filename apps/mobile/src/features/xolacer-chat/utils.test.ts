import { describe, expect, it } from "vitest";
import {
	type ConversationStatus,
	daysUntil,
	declineCooldownActive,
	hasSpoken,
	resolveMessageIdentity,
} from "@/features/xolacer-chat/utils";

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

describe("resolveMessageIdentity", () => {
	const THEM = "profile_them";

	const SOMEONE_ELSE = "profile_system";

	type Conversation = {
		counterpartProfileId: string;
		counterpartName: string;
		counterpartPhotoUrl?: string;
	};

	// A conversation where I'm the seeker: the counterpart is a real xolacer,
	// so their real name and photo are the correct thing to show.
	const asSeeker: Conversation = {
		counterpartName: "Maya",
		counterpartPhotoUrl: "https://cdn/maya.jpg",
		counterpartProfileId: THEM,
	};
	// A conversation where I'm the xolacer: the counterpart is anonymous, so
	// the server already resolved them to a pseudonym + catalog avatar.
	const asXolacer: Conversation = {
		counterpartName: "Camper 4F2A",
		counterpartPhotoUrl: "https://cdn/avatar-fox.png",
		counterpartProfileId: THEM,
	};

	// sender | conversation → identity to render (null = leave the SDK's)
	const cases: {
		sender?: string;
		conversation: Conversation;
		expected: { name: string; image?: string } | null;
		label: string;
	}[] = [
		// Also the reconnect case where the client's own id is unset: the resolver
		// never asks who "I" am, so my bubbles stay mine.
		{
			conversation: asSeeker,
			expected: null,
			label: "no sender id, nothing to override",
			sender: undefined,
		},
		// A sender who is neither member — a system notice, a safety intervention.
		// Falls back to the SDK rather than wearing the counterpart's face.
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
		// The regression this exists for: the counterpart is an active xolacer
		// elsewhere, real identity right on the object; only counterpart fields are read.
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
