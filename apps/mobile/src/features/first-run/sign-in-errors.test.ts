import { describe, expect, it } from "vitest";
import { describeError, errorCode, isCancellation } from "./sign-in-errors";

describe("isCancellation", () => {
	it("knows the SDKs' cancel codes", () => {
		expect(isCancellation({ code: "ERR_REQUEST_CANCELED" })).toBe(true);
		expect(isCancellation({ code: "SIGN_IN_CANCELLED" })).toBe(true);
		expect(isCancellation({ code: -5 })).toBe(true);
	});

	it("reads Clerk's web fallback from its message", () => {
		expect(isCancellation(new Error("User cancelled the flow"))).toBe(true);
		expect(isCancellation(new Error("Popup dismissed"))).toBe(true);
	});

	it("treats anything else as a failure", () => {
		expect(isCancellation(new Error("Network request failed"))).toBe(false);
		expect(isCancellation({ code: "form_identifier_not_found" })).toBe(false);
		expect(isCancellation("boom")).toBe(false);
		expect(isCancellation(null)).toBe(false);
	});
});

describe("errorCode", () => {
	it("returns a string or number code, nothing else", () => {
		expect(errorCode({ code: 42 })).toBe(42);
		expect(errorCode({ code: "x" })).toBe("x");
		expect(errorCode({ code: { nested: true } })).toBeUndefined();
		expect(errorCode(new Error("no code"))).toBeUndefined();
	});
});

describe("describeError", () => {
	it("names an Error by its name and message", () => {
		expect(describeError(new TypeError("bad"))).toBe("TypeError: bad");
	});

	it("keeps only the safe fields of an object", () => {
		const out = describeError({
			body: "secret-response",
			code: "E1",
			status: 500,
			token: "tok_123",
		});
		expect(out).toBe("code: E1\nstatus: 500");
		expect(out).not.toContain("secret");
		expect(out).not.toContain("tok_");
	});

	it("says so when an object has no safe field", () => {
		expect(describeError({ token: "tok_123" })).toBe(
			"Unrecognized error object. Proto: Object"
		);
	});

	it("stringifies anything else", () => {
		expect(describeError(7)).toBe("7");
	});
});
