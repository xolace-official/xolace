import { describe, expect, it, vi } from "vitest";
import { exitVent } from "./exit-vent";

const navigator = (canGoBack: boolean) => ({
	back: vi.fn(),
	canGoBack: () => canGoBack,
	dismissTo: vi.fn(),
});

describe("exitVent", () => {
	it("goes back to where the vent was opened from", () => {
		const router = navigator(true);
		exitVent(router);
		expect(router.back).toHaveBeenCalledOnce();
		expect(router.dismissTo).not.toHaveBeenCalled();
	});

	it("goes home when the vent was the first screen (a cold launch)", () => {
		const router = navigator(false);
		exitVent(router);
		expect(router.back).not.toHaveBeenCalled();
		expect(router.dismissTo).toHaveBeenCalledWith("/today");
	});
});
