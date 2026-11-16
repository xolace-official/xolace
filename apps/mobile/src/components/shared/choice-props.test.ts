import { describe, expect, it } from "vitest";
import { labelOf } from "./choice-props";

describe("labelOf", () => {
	const options = [
		{ id: "gh", label: "Ghana" },
		{ id: "ng", label: "Nigeria" },
	] as const;

	it("names the chosen option, or shows the value when none has it", () => {
		expect(labelOf(options, "ng")).toBe("Nigeria");
		expect(labelOf<string>(options, "ke")).toBe("ke");
	});
});
