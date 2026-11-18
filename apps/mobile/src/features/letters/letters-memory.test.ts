import { beforeAll, describe, expect, it } from "vitest";

/** As a release build: `__DEV__` false, so no fixtures are required in. */
const release = globalThis as { __DEV__?: boolean };
let mod: typeof import("./letters-memory");

beforeAll(async () => {
	release.__DEV__ = false;
	mod = await import("./letters-memory");
});

const DRAFT = { forWho: "Anyone" as const, text: "x".repeat(60) };

describe("the in-memory letters", () => {
	it("starts empty in a release build: not opted in, nothing sent or received", () => {
		const m = mod.useLettersMemory.getState();
		expect(m.optIn).toBe("unset");
		expect(m.sent).toEqual([]);
		expect(m.received).toEqual([]);
		expect(mod.limitOf(m)).toBeNull();
		expect(mod.unopenedOf(m)).toBeNull();
	});

	it("takes one letter a day, then says today", () => {
		expect(mod.memory.send(DRAFT)).toEqual({ kind: "pass" });
		expect(mod.memory.send(DRAFT)).toEqual({ kind: "limit", reason: "today" });
	});

	it("says three when three are waiting", () => {
		mod.useLettersMemory.setState({
			sent: ["a", "b", "c"].map((id) => ({
				id,
				line: "",
				seen: true,
				status: "waiting" as const,
			})),
			today: 0,
		});
		expect(mod.limitOf(mod.useLettersMemory.getState())).toBe("three");
	});

	it("withdraws only a waiting letter", () => {
		mod.useLettersMemory.setState({
			sent: [
				{ id: "w", line: "", seen: true, status: "waiting" },
				{ id: "r", line: "", seen: true, status: "received" },
			],
		});
		expect(mod.memory.withdraw("r")).toBe("received");
		expect(mod.memory.withdraw("w")).toBe("ok");
		expect(mod.useLettersMemory.getState().sent.map((l) => l.id)).toEqual([
			"r",
		]);
	});

	it("shows the unopened letter only while receiving is on", () => {
		mod.useLettersMemory.setState({
			optIn: "no",
			received: [
				{
					acknowledged: false,
					hidden: false,
					id: "u",
					opened: false,
					text: "Hi",
				},
			],
		});
		expect(mod.unopenedOf(mod.useLettersMemory.getState())).toBeNull();
		mod.memory.setOptIn("yes");
		expect(mod.unopenedOf(mod.useLettersMemory.getState())).toBe("u");
		mod.memory.open("u");
		expect(mod.unopenedOf(mod.useLettersMemory.getState())).toBeNull();
	});

	it("takes a reported letter away at once", () => {
		mod.memory.report("u");
		expect(mod.useLettersMemory.getState().received).toEqual([]);
	});
});
