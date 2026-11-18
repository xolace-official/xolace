import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { LettersMemory } from "./letters-memory";
import type { ReceivedLetter, SentLetter } from "./letters-model";

/** As a release build: `__DEV__` false, so no fixtures are required in. */
const release = globalThis as { __DEV__?: boolean };
let mod: typeof import("./letters-memory");
let data: typeof import("./use-letters-data");
let fresh: LettersMemory;

beforeAll(async () => {
	release.__DEV__ = false;
	mod = await import("./letters-memory");
	data = await import("./use-letters-data");
	fresh = mod.useLettersMemory.getState();
});

beforeEach(() => {
	mod.useLettersMemory.setState(fresh, true);
});

const state = () => mod.useLettersMemory.getState();
const DRAFT = { forWho: "Anyone" as const, text: "x".repeat(60) };
const sent = (id: string, status: SentLetter["status"]): SentLetter => ({
	id,
	line: "",
	seen: false,
	status,
});
const received = (
	id: string,
	patch: Partial<ReceivedLetter> = {}
): ReceivedLetter => ({
	acknowledged: false,
	hidden: false,
	id,
	opened: false,
	text: "Hi",
	...patch,
});
const THREE_WAITING = ["a", "b", "c"].map((id) => sent(id, "waiting"));

describe("the in-memory letters", () => {
	it("starts empty in a release build: not opted in, nothing sent or received", () => {
		expect(state().optIn).toBe("unset");
		expect(state().sent).toEqual([]);
		expect(state().received).toEqual([]);
		expect(mod.limitOf(state())).toBeNull();
		expect(mod.unopenedOf(state())).toBeNull();
	});

	it("takes one letter a day, then says today", () => {
		expect(mod.memory.send(DRAFT)).toEqual({ kind: "pass" });
		expect(mod.memory.send(DRAFT)).toEqual({ kind: "limit", reason: "today" });
	});

	it("counts today by the local day: yesterday's letter doesn't stop today's", () => {
		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);
		mod.useLettersMemory.setState({
			written: { count: 1, day: mod.localDay(yesterday) },
		});
		expect(mod.limitOf(state())).toBeNull();
		expect(mod.memory.send(DRAFT)).toEqual({ kind: "pass" });
		expect(state().written).toEqual({
			count: 1,
			day: mod.localDay(new Date()),
		});
	});

	it("says three when three are waiting", () => {
		mod.useLettersMemory.setState({ sent: THREE_WAITING });
		expect(mod.limitOf(state())).toBe("three");
	});

	it("says today before three when both apply", () => {
		mod.useLettersMemory.setState({
			sent: THREE_WAITING,
			written: { count: 1, day: mod.localDay(new Date()) },
		});
		expect(mod.limitOf(state())).toBe("today");
	});

	it("withdraws only a waiting letter", () => {
		mod.useLettersMemory.setState({
			sent: [sent("w", "waiting"), sent("r", "received")],
		});
		expect(mod.memory.withdraw("r")).toBe("received");
		expect(mod.memory.withdraw("w")).toBe("ok");
		expect(state().sent.map((l) => l.id)).toEqual(["r"]);
	});

	it("answers ok to withdrawing a letter it doesn't have, and changes nothing", () => {
		mod.useLettersMemory.setState({ sent: [sent("w", "waiting")] });
		expect(mod.memory.withdraw("nope")).toBe("ok");
		expect(state().sent.map((l) => l.id)).toEqual(["w"]);
	});

	it("marks only the given statuses seen", () => {
		mod.useLettersMemory.setState({
			sent: [sent("a", "received"), sent("b", "acknowledged")],
		});
		mod.memory.markSeen(["b"]);
		expect(state().sent.map((l) => l.seen)).toEqual([false, true]);
	});

	it("shows the unopened letter only while receiving is on", () => {
		mod.useLettersMemory.setState({ optIn: "no", received: [received("u")] });
		expect(mod.unopenedOf(state())).toBeNull();
		mod.memory.setOptIn("yes");
		expect(mod.unopenedOf(state())).toBe("u");
		mod.memory.open("u");
		expect(mod.unopenedOf(state())).toBeNull();
	});

	it("doesn't count a hidden unopened letter as waiting", () => {
		mod.useLettersMemory.setState({
			optIn: "yes",
			received: [received("h", { hidden: true }), received("u")],
		});
		expect(mod.unopenedOf(state())).toBe("u");
	});

	it("acknowledges, hides and unhides", () => {
		mod.useLettersMemory.setState({
			received: [received("u", { opened: true })],
		});
		mod.memory.acknowledge("u");
		expect(state().received[0]).toMatchObject({
			acknowledged: true,
			hidden: false,
		});
		mod.memory.hide("u");
		expect(state().received[0]?.hidden).toBe(true);
		mod.memory.unhide("u");
		expect(state().received[0]).toMatchObject({
			acknowledged: true,
			hidden: false,
		});
	});

	it("takes a reported letter away at once", () => {
		mod.useLettersMemory.setState({ received: [received("u"), received("v")] });
		mod.memory.report("u");
		expect(state().received.map((l) => l.id)).toEqual(["v"]);
	});
});

describe("the status read", () => {
	it("is the opt-in, why Write is off and the unopened letter, in one", () => {
		mod.useLettersMemory.setState({
			optIn: "yes",
			received: [received("u")],
			sent: THREE_WAITING,
		});
		expect(data.statusOf(state())).toEqual({
			optIn: "yes",
			unopenedId: "u",
			writeLimit: "three",
		});
	});

	it("is the offer with Write on, for a release build's empty store", () => {
		expect(data.statusOf(state())).toEqual({
			optIn: "unset",
			unopenedId: null,
			writeLimit: null,
		});
	});
});
