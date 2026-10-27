import { afterEach, describe, expect, test } from "bun:test";
import { createServer, type Server } from "node:net";
import { type LoopbackListener, listenForCode } from "./loopback";

const TIMEOUT_MS = 5000;
const LOOPBACK_REDIRECT = /^http:\/\/127\.0\.0\.1:\d+\/callback$/;
let listener: LoopbackListener | undefined;
let blocker: Server | undefined;

afterEach(() => {
	listener?.stop();
	blocker?.close();
	listener = undefined;
	blocker = undefined;
});

const callback = (query: string) => {
	if (!listener) {
		throw new Error("no listener");
	}
	return fetch(`${listener.redirectUri}?${query}`);
};

// Port 0 everywhere: tests must not take the real 53682 from a running `xolace login`.
describe("listenForCode", () => {
	test("resolves with the code when the state matches", async () => {
		listener = listenForCode({ port: 0, state: "s1", timeoutMs: TIMEOUT_MS });
		expect(listener.redirectUri).toMatch(LOOPBACK_REDIRECT);
		const response = await callback("code=abc&state=s1");
		expect(response.status).toBe(200);
		expect(await listener.code).toBe("abc");
	});

	test("rejects a mismatched state", async () => {
		listener = listenForCode({ port: 0, state: "s1", timeoutMs: TIMEOUT_MS });
		const settled = listener.code.catch((error: unknown) => error);
		expect((await callback("code=abc&state=evil")).status).toBe(400);
		expect(String(await settled)).toContain("different state");
	});

	test("rejects when Clerk returns an error", async () => {
		listener = listenForCode({ port: 0, state: "s1", timeoutMs: TIMEOUT_MS });
		const settled = listener.code.catch((error: unknown) => error);
		expect((await callback("error=access_denied&state=s1")).status).toBe(400);
		expect(String(await settled)).toContain("access_denied");
	});

	test("rejects after the timeout", async () => {
		listener = listenForCode({ port: 0, state: "s1", timeoutMs: 10 });
		await expect(listener.code).rejects.toThrow("Timed out");
	});

	test("moves to a free port when the preferred one is taken", async () => {
		const taken = createServer();
		blocker = taken;
		await new Promise<void>((resolve) => taken.listen(0, "127.0.0.1", resolve));
		const address = taken.address();
		if (typeof address !== "object" || address === null) {
			throw new Error("no port");
		}
		listener = listenForCode({
			port: address.port,
			state: "s1",
			timeoutMs: TIMEOUT_MS,
		});
		expect(listener.redirectUri).not.toContain(`:${address.port}/`);
		await callback("code=abc&state=s1");
		expect(await listener.code).toBe("abc");
	});
});
