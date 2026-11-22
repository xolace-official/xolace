import { describe, expect, it } from "vitest";
import { plusStatus } from "@/features/purchases/plus-status";

const FREE = {
	authLoading: false,
	serverPlus: false,
	signedIn: true,
	storeLoading: false,
	storePlus: false,
};

describe("plusStatus", () => {
	it("is free only once signed in and both the server and the store have answered", () => {
		expect(plusStatus(FREE)).toBe("free");
	});

	it("is Plus as soon as either source says so, answered or not", () => {
		expect(
			plusStatus({ ...FREE, serverPlus: undefined, storePlus: true })
		).toBe("plus");
		expect(plusStatus({ ...FREE, serverPlus: true, storeLoading: true })).toBe(
			"plus"
		);
		expect(plusStatus({ ...FREE, authLoading: true, storePlus: true })).toBe(
			"plus"
		);
	});

	it("is loading while the server has not answered", () => {
		expect(plusStatus({ ...FREE, serverPlus: undefined })).toBe("loading");
	});

	it("is loading while the store has not answered", () => {
		expect(plusStatus({ ...FREE, storeLoading: true })).toBe("loading");
	});

	it("is loading, never free, while auth loads or nobody is signed in", () => {
		expect(plusStatus({ ...FREE, authLoading: true })).toBe("loading");
		expect(plusStatus({ ...FREE, signedIn: false })).toBe("loading");
		expect(
			plusStatus({ ...FREE, serverPlus: undefined, signedIn: false })
		).toBe("loading");
	});
});
