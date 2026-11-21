import { describe, expect, it } from "vitest";
import { mayPresent, updateModeOf } from "./update-model";

describe("updateModeOf", () => {
	it("reads the store release", () => {
		expect(updateModeOf("new-version")).toBe("new-version");
	});

	it("falls back to the OTA notice", () => {
		expect(updateModeOf("ota-update")).toBe("ota-update");
		expect(updateModeOf(undefined)).toBe("ota-update");
		expect(updateModeOf(["new-version"])).toBe("ota-update");
	});
});

describe("mayPresent", () => {
	const ready = {
		gateLoading: false,
		navigationReady: true,
		pending: "new-version" as const,
		presented: false,
		revealed: true,
	};

	it("presents once everything is ready", () => {
		expect(mayPresent(ready)).toBe(true);
	});

	it("waits for a pending update, the gate, the cover, the stack and any sheet", () => {
		expect(mayPresent({ ...ready, pending: null })).toBe(false);
		expect(mayPresent({ ...ready, gateLoading: true })).toBe(false);
		expect(mayPresent({ ...ready, revealed: false })).toBe(false);
		expect(mayPresent({ ...ready, navigationReady: false })).toBe(false);
		expect(mayPresent({ ...ready, presented: true })).toBe(false);
	});
});
