import { describe, expect, it } from "vitest";
import { createStartGate } from "./start-gate";

const deferred = () => {
	let resolve = () => undefined as void;
	let reject: (e: Error) => void = () => undefined;
	const promise = new Promise<void>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, reject, resolve };
};

describe("createStartGate", () => {
	it("turns a second start away while the first is still asking", async () => {
		const gate = createStartGate();
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
		const gate = createStartGate();
		const failing = deferred();
		const a = gate.run(() => failing.promise);
		failing.reject(new Error("no mic"));
		await expect(a).rejects.toThrow("no mic");
		expect(gate.busy).toBe(false);
		expect(await gate.run(async () => undefined)).toBe(true);
	});
});
