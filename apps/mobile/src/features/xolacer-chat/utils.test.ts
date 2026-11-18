import { describe, expect, it } from "vitest";
import { resolveMessageIdentity } from "@/features/xolacer-chat/utils";

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
