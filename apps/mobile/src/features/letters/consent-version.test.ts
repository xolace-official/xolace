import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { LETTERS, LETTERS_OFFER_VERSION } from "./copy";

const pin = (copy: unknown) =>
	createHash("sha256").update(JSON.stringify(copy)).digest("hex").slice(0, 16);

const PINNED: Record<string, string> = {
	"letters_offer.v1": "1020c27f2a6c4447",
};

describe("LETTERS_OFFER_VERSION", () => {
	it("names the exact offer wording recorded with each opt-in", () => {
		expect(
			pin(LETTERS.offer),
			"LETTERS.offer changed: bump LETTERS_OFFER_VERSION and pin the new text under the new version."
		).toBe(PINNED[LETTERS_OFFER_VERSION]);
	});
});
