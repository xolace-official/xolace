import { describe, expect, it } from "vitest";
import { logInIfNeeded } from "@/features/purchases/revenuecat-identity";

const sdk = (current: string, logIn = () => Promise.resolve()) => {
	const calls: string[] = [];
	return {
		calls,
		getAppUserID: () => Promise.resolve(current),
		logIn: (id: string) => {
			calls.push(id);
			return logIn();
		},
	};
};

describe("logInIfNeeded", () => {
	it("logs in when the SDK is still anonymous, so the purchase lands on the account", async () => {
		const s = sdk("$RCAnonymousID:a");
		await logInIfNeeded(s, "user_1");
		expect(s.calls).toEqual(["user_1"]);
	});

	it("does nothing when the SDK already has this user", async () => {
		const s = sdk("user_1");
		await logInIfNeeded(s, "user_1");
		expect(s.calls).toEqual([]);
	});

	it("does nothing before the account's id is known", async () => {
		const s = sdk("$RCAnonymousID:a");
		await logInIfNeeded(s, null);
		expect(s.calls).toEqual([]);
	});

	it("fails when the login fails, so nothing is bought anonymously", async () => {
		const s = sdk("$RCAnonymousID:a", () =>
			Promise.reject(new Error("network unavailable"))
		);
		await expect(logInIfNeeded(s, "user_1")).rejects.toThrow(
			"network unavailable"
		);
	});
});
