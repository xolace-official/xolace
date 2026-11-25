import { describe, expect, it } from "vitest";
import {
	type AdoptedQuote,
	type HandoverDeps,
	handOver,
	readHandoverMemory,
} from "@/features/quotes/reminders/handover";

const TOKEN = "ExponentPushToken[a]";

function phone(
	o: {
		adopted?: AdoptedQuote;
		permitted?: boolean;
		token?: string | null;
		zone?: string | null;
		registerFails?: boolean;
		memory?: unknown;
	} = {}
) {
	const calls: string[] = [];
	const memory = readHandoverMemory(o.memory);
	const deps: HandoverDeps = {
		adopt: () => {
			calls.push("adopt");
			return Promise.resolve(
				o.adopted === undefined ? { enabled: true } : o.adopted
			);
		},
		handedOver: (id) => memory.handedOver.includes(id),
		markHandedOver: (id) => {
			memory.handedOver.push(id);
		},
		permitted: () => Promise.resolve(o.permitted ?? true),
		pushToken: () => Promise.resolve(o.token === undefined ? TOKEN : o.token),
		register: (pushToken) => {
			calls.push(`register:${pushToken}`);
			return o.registerFails
				? Promise.reject(new Error("offline"))
				: Promise.resolve();
		},
		saveTimezone: (zone) => {
			calls.push(`timezone:${zone}`);
			return Promise.resolve();
		},
		timezone: () => (o.zone === undefined ? "Africa/Lagos" : o.zone),
	};
	return { calls, deps, memory };
}

describe("handOver", () => {
	it("registers this device and its zone for an adopted daily quote", async () => {
		const { calls, deps, memory } = phone();
		expect(await handOver("user_a", deps)).toBe("registered");
		expect(calls).toEqual([
			"adopt",
			`register:${TOKEN}`,
			"timezone:Africa/Lagos",
		]);
		expect(memory.handedOver).toEqual(["user_a"]);
	});

	it("registers without a zone when the device has none", async () => {
		const { calls, deps } = phone({ zone: null });
		expect(await handOver("user_a", deps)).toBe("registered");
		expect(calls).toEqual(["adopt", `register:${TOKEN}`]);
	});

	it("registers nothing when the daily quote wasn't adopted on", async () => {
		for (const adopted of [null, { enabled: false }]) {
			const { calls, deps, memory } = phone({ adopted });
			expect(await handOver("user_a", deps)).toBe("off");
			expect(calls).toEqual(["adopt"]);
			expect(memory.handedOver).toEqual(["user_a"]);
		}
	});

	it("is done without permission, and never fetches a token for it", async () => {
		const { calls, deps, memory } = phone({ permitted: false });
		expect(await handOver("user_a", deps)).toBe("no_permission");
		expect(calls).toEqual(["adopt"]);
		expect(memory.handedOver).toEqual(["user_a"]);
	});

	it("tries again next launch when the token couldn't be fetched", async () => {
		const { calls, deps, memory } = phone({ token: null });
		expect(await handOver("user_a", deps)).toBe("no_token");
		expect(calls).toEqual(["adopt"]);
		expect(memory.handedOver).toEqual([]);
	});

	it("tries again next launch when registering throws", async () => {
		const { deps, memory } = phone({ registerFails: true });
		await expect(handOver("user_a", deps)).rejects.toThrow("offline");
		expect(memory.handedOver).toEqual([]);
	});

	it("does nothing for an account already handed over", async () => {
		const { calls, deps } = phone({ memory: { handedOver: ["user_a"] } });
		expect(await handOver("user_a", deps)).toBe("already");
		expect(calls).toEqual([]);
	});

	it("hands over a second account on the same phone", async () => {
		const { calls, deps } = phone({ memory: { handedOver: ["user_a"] } });
		expect(await handOver("user_b", deps)).toBe("registered");
		expect(calls[0]).toBe("adopt");
	});

	it("runs once more on a phone the first builds marked adopted", async () => {
		const { calls, deps } = phone({ memory: { adopted: true } });
		expect(await handOver("user_a", deps)).toBe("registered");
		expect(calls).toContain(`register:${TOKEN}`);
	});
});

describe("readHandoverMemory", () => {
	it("keeps the accounts handed over", () => {
		expect(readHandoverMemory({ handedOver: ["user_a", "user_b"] })).toEqual({
			handedOver: ["user_a", "user_b"],
		});
	});

	it("reads anything else as nobody handed over", () => {
		for (const stored of [
			undefined,
			null,
			"x",
			{ adopted: true },
			{ handedOver: "user_a" },
		]) {
			expect(readHandoverMemory(stored)).toEqual({ handedOver: [] });
		}
	});

	it("drops entries that aren't account ids", () => {
		expect(readHandoverMemory({ handedOver: ["user_a", 3, null] })).toEqual({
			handedOver: ["user_a"],
		});
	});
});
