import { describe, expect, it } from "vitest";
import { attemptsFor, MAX_RETRIES } from "./bootstrap-retry";

/** Leaking a spent budget across sessions signs a healthy new sign-in straight back out. */
describe("attemptsFor", () => {
	it("accumulates within one session", () => {
		expect(attemptsFor({ attempt: 3, session: "sess_a" }, "sess_a")).toBe(3);
	});

	it("starts fresh on a session it was not spent against", () => {
		expect(
			attemptsFor({ attempt: MAX_RETRIES, session: "sess_a" }, "sess_b")
		).toBe(0);
	});

	it("starts fresh after sign-out", () => {
		expect(attemptsFor({ attempt: 2, session: "sess_a" }, null)).toBe(0);
	});
});
