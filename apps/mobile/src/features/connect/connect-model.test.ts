import { describe, expect, it } from "vitest";
import {
	type ConnectInputs,
	connectState,
	readsDirectory,
	routedFilter,
	routedSegment,
	routeKey,
} from "./connect-model";
import {
	CONVERSATIONS,
	DIRECTORY,
	NOW,
	SEEKER,
	STREAM,
	XOLACER,
	XOLACER_PAUSED,
	XOLACER_UNPUBLISHED,
} from "./dev/fixtures";

const inputs = (over: Partial<ConnectInputs> = {}): ConnectInputs => ({
	conversations: CONVERSATIONS,
	directory: undefined,
	filter: null,
	now: NOW,
	picked: null,
	presentSnapshot: null,
	status: SEEKER,
	stream: STREAM,
	...over,
});
const ready = (over: Partial<ConnectInputs> = {}) => {
	const s = connectState(inputs(over));
	if (s.phase !== "ready") {
		throw new Error(`expected ready, got ${s.phase}`);
	}
	return s;
};

describe("connectState", () => {
	it("loads until both status and the list are in, then honours the kill switch", () => {
		expect(connectState(inputs({ status: undefined })).phase).toBe("loading");
		expect(connectState(inputs({ conversations: undefined })).phase).toBe(
			"loading"
		);
		expect(connectState(inputs({ status: { enabled: false } })).phase).toBe(
			"disabled"
		);
	});

	it("keeps the routed segment while loading", () => {
		expect(
			connectState(inputs({ conversations: undefined, picked: "xolacers" }))
		).toEqual({ phase: "loading", segment: "xolacers" });
		expect(connectState(inputs({ status: undefined }))).toEqual({
			phase: "loading",
			segment: "chats",
		});
	});

	it("shows the setup banner only to a Xolacer who hasn't published", () => {
		expect(ready({ status: XOLACER_UNPUBLISHED }).setupBanner).toBe(true);
		expect(ready({ status: XOLACER }).setupBanner).toBe(false);
		expect(ready({ status: SEEKER }).setupBanner).toBe(false);
	});

	it("gives a published Xolacer the way to their profile, paused or not", () => {
		expect(ready({ status: XOLACER }).myProfile).toEqual({ paused: false });
		expect(ready({ status: XOLACER_PAUSED }).myProfile).toEqual({
			paused: true,
		});
		expect(ready({ status: XOLACER_UNPUBLISHED }).myProfile).toBeNull();
		expect(ready({ status: SEEKER }).myProfile).toBeNull();
	});

	it("leaves the roster loading until the directory is read", () => {
		expect(ready().roster.cards).toBeUndefined();
		const roster = ready({ directory: DIRECTORY, filter: "grief" }).roster;
		expect(roster.cards?.map((c) => c.name)).toEqual(["Kojo"]);
		expect(roster.filter).toBe("grief");
	});

	it("lands on what was picked, else Chats once there are rows", () => {
		expect(ready().segment).toBe("chats");
		expect(ready({ picked: "xolacers" }).segment).toBe("xolacers");
		expect(ready({ conversations: [] }).segment).toBe("xolacers");
	});
});

describe("the routed params", () => {
	it("takes a specialty as the roster, filtered", () => {
		const route = { specialty: "grief" };
		expect(routedSegment(route)).toBe("xolacers");
		expect(routedFilter(route, "sleep")).toBe("grief");
	});

	it("clears a leftover filter when sent to Xolacers without one", () => {
		expect(routedFilter({ view: "xolacers" }, "sleep")).toBeNull();
	});

	it("keeps the filter for Chats or an unknown view, and ignores an unknown specialty", () => {
		expect(routedFilter({ view: "chats" }, "sleep")).toBe("sleep");
		expect(routedSegment({ view: "somewhere" })).toBeNull();
		expect(routedFilter({ specialty: "nonsense" }, "sleep")).toBe("sleep");
	});

	it("changes key on a second tap with the same params", () => {
		expect(routeKey({ navToken: "1", view: "chats" })).not.toBe(
			routeKey({ navToken: "2", view: "chats" })
		);
	});
});

describe("readsDirectory", () => {
	it("reads only on the roster while chat is on", () => {
		expect(readsDirectory(SEEKER, "xolacers")).toBe(true);
		expect(readsDirectory(SEEKER, "chats")).toBe(false);
		expect(readsDirectory({ enabled: false }, "xolacers")).toBe(false);
		expect(readsDirectory(undefined, "xolacers")).toBe(false);
	});
});
