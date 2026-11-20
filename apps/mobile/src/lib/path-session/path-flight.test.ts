import { describe, expect, it } from "vitest";
import { createPathFlight } from "./path-flight";

const deferred = () => {
	let resolve = () => undefined as void;
	let reject: (e: Error) => void = () => undefined;
	const promise = new Promise<void>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, reject, resolve };
};

describe("createPathFlight", () => {
	it("completes after a start that is still in flight, instead of dropping it", async () => {
		const flight = createPathFlight();
		const start = deferred();
		const calls: string[] = [];
		const started = flight.start(() => {
			calls.push("start");
			return start.promise;
		});
		const completed = flight.complete(() => {
			calls.push("complete");
			return Promise.resolve();
		});
		await Promise.resolve();
		expect(calls).toEqual(["start"]);
		start.resolve();
		expect(await started).toBe(true);
		expect(await completed).toBe(true);
		expect(calls).toEqual(["start", "complete"]);
	});

	it("still completes when the start failed", async () => {
		const flight = createPathFlight();
		const start = deferred();
		const started = flight.start(() => start.promise);
		const completed = flight.complete(() => Promise.resolve());
		start.reject(new Error("offline"));
		expect(await started).toBe(false);
		expect(await completed).toBe(true);
	});

	it("turns a second start away while the first is in flight", async () => {
		const flight = createPathFlight();
		const start = deferred();
		let starts = 0;
		const task = () => {
			starts += 1;
			return start.promise;
		};
		const a = flight.start(task);
		expect(await flight.start(task)).toBe(false);
		start.resolve();
		expect(await a).toBe(true);
		expect(starts).toBe(1);
		expect(await flight.start(task)).toBe(true);
	});

	it("takes a new start after one that failed", async () => {
		const flight = createPathFlight();
		expect(await flight.start(() => Promise.reject(new Error("offline")))).toBe(
			false
		);
		expect(await flight.start(() => Promise.resolve())).toBe(true);
	});

	it("reports a failed completion as false", async () => {
		const flight = createPathFlight();
		expect(
			await flight.complete(() => Promise.reject(new Error("offline")))
		).toBe(false);
	});
});
