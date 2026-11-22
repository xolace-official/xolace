import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SAFETY_DEADLINE_MS } from "../intake/read";
import { classifyLetter } from "./run";

type Create = (
	body: unknown,
	options: { signal: AbortSignal }
) => Promise<unknown>;

const client = vi.hoisted(() => ({
	create: undefined as unknown as Create,
}));

vi.mock("../providers/anthropic", async (orig) => ({
	...(await orig<typeof import("../providers/anthropic")>()),
	getAnthropicClient: () => ({
		messages: {
			create: (body: unknown, options: { signal: AbortSignal }) =>
				client.create(body, options),
		},
	}),
}));

const VERDICT = {
	contact: false,
	crisis_mention: "none",
	forced_positivity: false,
	graphic: false,
	hostile: false,
	identifying: false,
	language: "en",
	link: false,
	medical: false,
	minimising: false,
	off_topic: false,
	preaching: false,
	selling: false,
};

const reply = (text: string) => ({
	content: [{ text, type: "text" }],
});

describe("classifyLetter", () => {
	beforeEach(() => {
		vi.spyOn(console, "error").mockImplementation(() => undefined);
	});
	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it("returns the parsed verdict", async () => {
		client.create = async () => reply(JSON.stringify(VERDICT));
		expect(await classifyLetter("You are not alone.")).toEqual({
			crisisMention: "none",
			fixable: null,
			hostile: false,
			language: "en",
		});
	});

	it("is null when the reply isn't a whole verdict", async () => {
		client.create = async () => reply('{"hostile":false}');
		expect(await classifyLetter("You are not alone.")).toBeNull();
	});

	it("is null when the call fails", async () => {
		client.create = async () => {
			throw new Error("overloaded");
		};
		expect(await classifyLetter("You are not alone.")).toBeNull();
	});

	it("is null at the safety deadline, and aborts the call", async () => {
		vi.useFakeTimers();
		let signal: AbortSignal | undefined;
		client.create = (_body, options) => {
			signal = options.signal;
			return new Promise(() => undefined);
		};
		const result = classifyLetter("You are not alone.");
		await vi.advanceTimersByTimeAsync(SAFETY_DEADLINE_MS);
		expect(await result).toBeNull();
		expect(signal?.aborted).toBe(true);
	});
});
