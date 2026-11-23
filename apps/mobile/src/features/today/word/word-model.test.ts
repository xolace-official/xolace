import { describe, expect, it } from "vitest";
import { wordLine } from "./word-model";

const today = (curated: string | null, session: string | null) =>
	({
		curated: curated ? { text: curated } : null,
		session: session ? { text: session } : null,
	}) as unknown as Parameters<typeof wordLine>[0];

describe("wordLine", () => {
	it("is the session's line first, as Quotes shows it, then the curated one, then none", () => {
		expect(wordLine(today("Slow is still moving.", "Mine."))).toBe("Mine.");
		expect(wordLine(today("Slow is still moving.", null))).toBe(
			"Slow is still moving."
		);
		expect(wordLine(today(null, null))).toBeNull();
	});

	it("is undefined while it loads", () => {
		expect(wordLine(undefined)).toBeUndefined();
	});
});
