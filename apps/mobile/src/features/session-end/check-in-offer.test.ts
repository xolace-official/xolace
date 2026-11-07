import { describe, expect, it } from "vitest";
import { offersCheckIn } from "./check-in-offer";

describe("offersCheckIn", () => {
	it("offers a check-in to someone who needs support every day", () => {
		expect(offersCheckIn("every_day")).toBe(true);
	});

	it("offers a check-in to someone who isn't sure, since they still choose", () => {
		expect(offersCheckIn("not_sure")).toBe(true);
	});

	it("never offers a reminder to someone for whom this happens only occasionally", () => {
		expect(offersCheckIn("occasionally")).toBe(false);
	});
});
