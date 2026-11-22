// @vitest-environment edge-runtime
/**
 * `ai/slotFill.fillSlots` and user_phrase. Sit with this quotes the phrase
 * back as the person's own ("You said: “…”"), so it is kept only when they
 * wrote or said it; otherwise the slot stays empty and the step's default
 * line plays. Haiku is faked: each test sets what it "extracts".
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { seedSession } from "./fixtures.helpers";
import { asNewUser, type SeededUser } from "./harness.helpers";
import { aggregatesMock, anthropicMock } from "./mocks.helpers";

const stub = vi.hoisted(() => ({ reply: "" }));

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../ai/providers/anthropic", async (orig) => ({
	...(await orig<typeof import("../ai/providers/anthropic")>()),
	...anthropicMock(() => stub.reply),
}));

const WROTE = "Honestly I'm SO tired of feeling one step behind, every day.";
const MIRROR = "It sounds like you’re carrying a lot right now.";

beforeEach(() => {
	stub.reply = "";
});

async function fill(
	user: SeededUser,
	phrase: string,
	userText: string | undefined
): Promise<Record<string, string> | undefined> {
	stub.reply = JSON.stringify({ user_phrase: phrase });
	const sessionId: Id<"sessions"> = await seedSession(
		user.root,
		user.profileId
	);
	await user.root.action(internal.ai.slotFill.fillSlots, {
		exerciseTitle: "soften_toward_it",
		mirrorText: MIRROR,
		primaryEmotion: "shame",
		sessionId,
		slotKeys: ["user_phrase"],
		userLanguageTags: ["tired", "one step behind"],
		...(userText === undefined ? {} : { userText }),
	});
	const session = await user.root.run((ctx) => ctx.db.get(sessionId));
	return session?.exerciseSlots;
}

describe("fillSlots: user_phrase", () => {
	it("quotes a phrase the person wrote, whatever its case and punctuation", async () => {
		const user = await asNewUser();
		expect(await fill(user, "so tired of feeling", WROTE)).toEqual({
			user_phrase: "so tired of feeling",
		});
		expect(await fill(user, "I'm so tired.", WROTE)).toEqual({
			user_phrase: "I’m so tired",
		});
	});

	it("leaves the slot to the default when the phrase came from the mirror", async () => {
		const user = await asNewUser();
		expect(await fill(user, "carrying a lot", WROTE)).toBeUndefined();
	});

	it("leaves the slot to the default when the phrase isn't word for word theirs", async () => {
		const user = await asNewUser();
		expect(await fill(user, "tired and behind", WROTE)).toBeUndefined();
		expect(await fill(user, "feeling so tired", WROTE)).toBeUndefined();
	});

	it("leaves the slot to the default for a job scheduled without their text", async () => {
		const user = await asNewUser();
		expect(await fill(user, "one step behind", undefined)).toBeUndefined();
	});
});
