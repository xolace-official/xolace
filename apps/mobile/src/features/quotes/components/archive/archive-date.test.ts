import { describe, expect, it } from "vitest";
import { formatDate } from "@/features/quotes/components/archive/archive-date";

describe("formatDate", () => {
	it("reads the UTC date string as a local day, not a UTC instant", () => {
		// `new Date("2026-09-05")` is UTC midnight: Sep 4 in any negative offset.
		expect(formatDate("2026-09-05").dayMonth).toBe("05/09");
		expect(formatDate("2026-09-05").weekday).toBe(
			new Date(2026, 8, 5).toLocaleDateString(undefined, { weekday: "long" })
		);
	});

	it("zero-pads both parts", () => {
		expect(formatDate("2026-01-07").dayMonth).toBe("07/01");
	});
});
