import { describe, expect, it } from "vitest";
import { isPoolable } from "./poolability";

describe("isPoolable", () => {
	// kept | contributed | safeguard → poolable
	const cases: {
		kept?: boolean;
		contributed?: boolean;
		safeguard?: "none" | "gentle" | "elevated" | "crisis";
		expected: boolean;
	}[] = [
		{ contributed: true, expected: true, kept: true, safeguard: "none" },
		{ contributed: true, expected: true, kept: true, safeguard: "gentle" },
		{ contributed: true, expected: true, kept: true, safeguard: "elevated" },
		// safety row: crisis never enters the pool
		{ contributed: true, expected: false, kept: true, safeguard: "crisis" },
		{ contributed: true, expected: false, kept: false, safeguard: "none" },
		{ contributed: true, expected: false, kept: undefined, safeguard: "none" },
		{ contributed: false, expected: false, kept: true, safeguard: "none" },
		{ contributed: undefined, expected: false, kept: true, safeguard: "none" },
	];

	for (const c of cases) {
		it(`kept=${c.kept} contributed=${c.contributed} safeguard=${c.safeguard} → ${c.expected}`, () => {
			expect(
				isPoolable({
					contributedReflection: c.contributed,
					kept: c.kept,
					safeguardLevel: c.safeguard,
				})
			).toBe(c.expected);
		});
	}
});
