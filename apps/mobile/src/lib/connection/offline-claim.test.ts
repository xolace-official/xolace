import { describe, expect, it } from "vitest";
import { createOfflineClaims } from "./offline-claim";

describe("claiming the offline message", () => {
	it("stays claimed until every screen that claimed it lets go", () => {
		const claims = createOfflineClaims();
		const thread = claims.claim();
		const channel = claims.claim();
		thread();
		expect(claims.claimed()).toBe(true);
		channel();
		expect(claims.claimed()).toBe(false);
	});

	it("ignores a second release of the same claim", () => {
		const claims = createOfflineClaims();
		const first = claims.claim();
		claims.claim();
		first();
		first();
		expect(claims.claimed()).toBe(true);
	});
});
