import { describe, expect, it } from "vitest";
import { consumesBack } from "@/features/intake/v2/intake-back";

describe("consumesBack", () => {
	it("holds Flux's flow, the first look included, on screen", () => {
		expect(consumesBack("flux")).toBe(true);
	});

	it("lets back leave the app from the founder letter", () => {
		expect(consumesBack("letter")).toBe(false);
	});
});
