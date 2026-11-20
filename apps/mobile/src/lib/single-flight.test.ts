import { describe, expect, it } from "vitest";
import { createSingleFlight } from "./single-flight";

const deferred = () => {
	let resolve = () => undefined as void;
	let reject: (e: Error) => void = () => undefined;
	const promise = new Promise<void>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, reject, resolve };
};

describe("createSingleFlight", () => {
	it("turns a second start away while the first is still asking", async () => {
		const gate = createSingleFlight();
		const first = deferred();
		let starts = 0;
		const attempt = () => {
			starts += 1;
			return first.promise;
		};
		const a = gate.run(attempt);
		const b = gate.run(attempt);
		expect(gate.busy).toBe(true);
		expect(await b).toBe(false);
		first.resolve();
		expect(await a).toBe(true);
		expect(starts).toBe(1);
		expect(gate.busy).toBe(false);
	});

	it("lets go after a failed attempt, so Start can be tried again", async () => {
		const gate = createSingleFlight();
		const failing = deferred();
		const a = gate.run(() => failing.promise);
		failing.reject(new Error("no mic"));
		await expect(a).rejects.toThrow("no mic");
		expect(gate.busy).toBe(false);
		expect(await gate.run(async () => undefined)).toBe(true);
	});

	it("reports busy changes so a screen can show them", async () => {
		const seen: boolean[] = [];
		const gate = createSingleFlight((busy) => seen.push(busy));
		const work = deferred();
		const a = gate.run(() => work.promise);
		expect(seen).toEqual([true]);
		work.resolve();
		await a;
		expect(seen).toEqual([true, false]);
	});

	it("lets go when the task throws before its first await", async () => {
		const gate = createSingleFlight();
		await expect(
			gate.run(() => {
				throw new Error("boom");
			})
		).rejects.toThrow("boom");
		expect(gate.busy).toBe(false);
	});
});
