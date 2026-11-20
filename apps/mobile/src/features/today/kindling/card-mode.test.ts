import { describe, expect, it } from "vitest";
import {
	heldEmptyMode,
	kindlingCardMode,
	kindlingEmptyMode,
} from "./card-mode";

const MARK = { sessionId: "s1", startedAt: 1 };

describe("kindlingEmptyMode", () => {
	it("waits while the entitlement loads, unless the server already says Xolace+", () => {
		expect(
			kindlingEmptyMode({
				isLoading: true,
				isPlus: false,
				settingUp: undefined,
			})
		).toBeUndefined();
		expect(
			kindlingEmptyMode({ isLoading: true, isPlus: true, settingUp: MARK })
		).toBe("setting-up");
		expect(
			kindlingEmptyMode({ isLoading: true, isPlus: true, settingUp: null })
		).toBe("plus");
	});

	it("shows free members what Xolace+ adds, never setting up", () => {
		expect(
			kindlingEmptyMode({ isLoading: false, isPlus: false, settingUp: MARK })
		).toBe("free");
		expect(
			kindlingEmptyMode({
				isLoading: false,
				isPlus: false,
				settingUp: undefined,
			})
		).toBe("free");
	});

	it("shows Xolace+ members setting up while the server marks one, then none right now", () => {
		expect(
			kindlingEmptyMode({ isLoading: false, isPlus: true, settingUp: MARK })
		).toBe("setting-up");
		expect(
			kindlingEmptyMode({ isLoading: false, isPlus: true, settingUp: null })
		).toBe("plus");
	});

	it("waits for the setting-up mark before choosing for Xolace+", () => {
		expect(
			kindlingEmptyMode({
				isLoading: false,
				isPlus: true,
				settingUp: undefined,
			})
		).toBeUndefined();
	});
});

describe("kindlingCardMode", () => {
	it("shows a live kindling whatever else is set", () => {
		expect(kindlingCardMode({ id: "k" }, "setting-up")).toBe("live");
		expect(kindlingCardMode({ id: "k" }, "free")).toBe("live");
		expect(kindlingCardMode({ id: "k" }, undefined)).toBe("live");
	});

	it("shows the empty mode with none", () => {
		expect(kindlingCardMode(null, "plus")).toBe("plus");
		expect(kindlingCardMode(null, "free")).toBe("free");
		expect(kindlingCardMode(null, "setting-up")).toBe("setting-up");
		expect(kindlingCardMode(null, undefined)).toBeUndefined();
	});

	it("waits while the kindling loads", () => {
		expect(kindlingCardMode(undefined, "plus")).toBeUndefined();
	});
});

describe("heldEmptyMode", () => {
	it("keeps the last mode while a re-read loads (free → Xolace+ mid-session)", () => {
		const free = kindlingEmptyMode({
			isLoading: false,
			isPlus: false,
			settingUp: undefined,
		});
		const loading = kindlingEmptyMode({
			isLoading: false,
			isPlus: true,
			settingUp: undefined,
		});
		expect(loading).toBeUndefined();
		expect(heldEmptyMode(free, loading)).toBe("free");
		expect(heldEmptyMode(free, "plus")).toBe("plus");
	});

	it("is undefined only until the first resolve", () => {
		expect(heldEmptyMode(undefined, undefined)).toBeUndefined();
		expect(heldEmptyMode(undefined, "free")).toBe("free");
	});
});
