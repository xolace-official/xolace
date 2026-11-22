import { describe, expect, it } from "vitest";
import {
	keptExpiry,
	rekindleFailure,
	rekindleOffer,
	runRekindle,
} from "./rekindle-model";

describe("rekindleOffer", () => {
	it("offers the count a saver would bring back", () => {
		expect(rekindleOffer(12, undefined)).toBe(12);
	});

	it("offers nothing without a revive on offer", () => {
		expect(rekindleOffer(undefined, undefined)).toBeNull();
	});

	it("hides an offer the server turned down", () => {
		expect(rekindleOffer(12, 12)).toBeNull();
	});

	it("shows a different offer than the one turned down", () => {
		expect(rekindleOffer(4, 12)).toBe(4);
	});
});

describe("keptExpiry", () => {
	it("keeps hiding while the query still offers it", () => {
		expect(keptExpiry(12, 12)).toBe(12);
	});

	it("forgets it once the query drops the offer", () => {
		expect(keptExpiry(undefined, 12)).toBeUndefined();
	});
});

describe("rekindleFailure", () => {
	it("hides the offer when the server has no revive", () => {
		expect(rekindleFailure({ data: { code: "no_revive_available" } })).toBe(
			"gone"
		);
	});

	it("leaves the chip up for anything else", () => {
		expect(rekindleFailure(new Error("Network request failed"))).toBe("retry");
		expect(rekindleFailure({ data: { code: "unauthenticated" } })).toBe(
			"retry"
		);
		expect(rekindleFailure({ data: "text" })).toBe("retry");
		expect(rekindleFailure(null)).toBe("retry");
	});
});

describe("offer → revive", () => {
	it("spends the saver and reports the revived count", async () => {
		const offer = rekindleOffer(12, undefined);
		expect(offer).toBe(12);
		const result = await runRekindle(() => Promise.resolve(13));
		expect(result).toEqual({ day: 13, ok: true });
	});

	it("hides a turned-down offer until the query drops it, then offers again", async () => {
		const result = await runRekindle(() =>
			Promise.reject({ data: { code: "no_revive_available" } })
		);
		expect(result).toEqual({ failure: "gone", ok: false });
		let expired: number | undefined = 12;
		expect(rekindleOffer(12, keptExpiry(12, expired))).toBeNull();
		expired = keptExpiry(undefined, expired);
		expect(rekindleOffer(undefined, expired)).toBeNull();
		expect(rekindleOffer(12, keptExpiry(12, expired))).toBe(12);
	});

	it("leaves the offer up after a network failure", async () => {
		const result = await runRekindle(() =>
			Promise.reject(new Error("Network request failed"))
		);
		expect(result).toEqual({ failure: "retry", ok: false });
		expect(rekindleOffer(12, undefined)).toBe(12);
	});
});
