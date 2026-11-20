import { LETTER_MAX_CHARS } from "@xolace/backend/shared";
import { describe, expect, it, vi } from "vitest";
import {
	FRESH,
	type Kept,
	keptFor,
	validKept,
	withPatch,
} from "./device-memory";
import { END_CARD_FRESH } from "./letters-model";

vi.mock("@clerk/expo", () => ({ useAuth: () => ({ userId: null }) }));

const A_DRAFT: Kept = {
	endCard: { offUntil: 0, passes: 2, shownAt: 1000 },
	forWho: "Grief",
	held: "",
	owner: "user_a",
	text: "Something that helped me on a bad week.",
};

describe("what letters keep on the device", () => {
	it("reads a well-formed store back as it was", () => {
		expect(validKept(A_DRAFT)).toEqual(A_DRAFT);
	});

	it("starts fresh when the end card's memory is malformed (offUntil missing)", () => {
		const stored = { ...A_DRAFT, endCard: { passes: 1, shownAt: null } };
		expect(validKept(stored)).toEqual({ ...FRESH, owner: null });
	});

	it("starts fresh on a number that isn't finite, a For it doesn't know, or words past the limit", () => {
		const fresh = { ...FRESH, owner: null };
		expect(
			validKept({
				...A_DRAFT,
				endCard: { ...A_DRAFT.endCard, passes: Number.NaN },
			})
		).toEqual(fresh);
		expect(validKept({ ...A_DRAFT, forWho: "Anger" })).toEqual(fresh);
		expect(
			validKept({ ...A_DRAFT, text: "x".repeat(LETTER_MAX_CHARS + 1) })
		).toEqual(fresh);
		expect(validKept({ ...A_DRAFT, held: 3 })).toEqual(fresh);
		expect(validKept(null)).toEqual(fresh);
		expect(validKept("draft")).toEqual(fresh);
	});

	it("shows another account's draft as fresh", () => {
		expect(keptFor(A_DRAFT, "user_b")).toEqual({ ...FRESH, owner: "user_b" });
		expect(keptFor(A_DRAFT, "user_a")).toBe(A_DRAFT);
	});

	it("wipes A's draft and memory when B writes on the same device", () => {
		const b = withPatch(A_DRAFT, "user_b", { text: "Hello" });
		expect(b).toEqual({ ...FRESH, owner: "user_b", text: "Hello" });
		expect(b.endCard).toEqual(END_CARD_FRESH);
	});

	it("keeps the rest of the owner's draft on a write", () => {
		expect(withPatch(A_DRAFT, "user_a", { held: A_DRAFT.text })).toEqual({
			...A_DRAFT,
			held: A_DRAFT.text,
		});
	});
});
