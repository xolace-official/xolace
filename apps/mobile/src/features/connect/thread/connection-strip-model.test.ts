import { describe, expect, it } from "vitest";
import { chatStream, connectionStripLine } from "./connection-strip-model";

const OFFLINE =
	"You're offline. Messages won't send until the connection is back.";
const CANT_REACH =
	"Can't reach chat right now. Messages won't send until it's back.";
const RECONNECTING = "Reconnecting. Hold onto that for a second.";

describe("chat's connection strip", () => {
	it("says offline when the device is, whatever Stream says", () => {
		expect(
			connectionStripLine({ reach: "offline", stream: "reconnecting" })
		).toBe(OFFLINE);
		expect(connectionStripLine({ reach: "offline", stream: "online" })).toBe(
			OFFLINE
		);
	});

	it("shows nothing while Stream and Xolace can be reached", () => {
		expect(
			connectionStripLine({ reach: "reachable", stream: "online" })
		).toBeNull();
	});

	it("says reconnecting while Stream recovers and Xolace can be reached", () => {
		expect(
			connectionStripLine({ reach: "reachable", stream: "reconnecting" })
		).toBe(RECONNECTING);
	});

	it("says chat can't be reached, never offline, when the internet works", () => {
		expect(connectionStripLine({ reach: "reachable", stream: "down" })).toBe(
			CANT_REACH
		);
		expect(connectionStripLine({ reach: "cant_reach", stream: "online" })).toBe(
			CANT_REACH
		);
		expect(
			connectionStripLine({ reach: "cant_reach", stream: "reconnecting" })
		).toBe(CANT_REACH);
	});
});

describe("Stream's side of the strip", () => {
	it("is online unless Stream has said it's offline", () => {
		expect(chatStream({ held: false, isOnline: true, recovering: false })).toBe(
			"online"
		);
		expect(chatStream({ held: false, isOnline: null, recovering: false })).toBe(
			"online"
		);
	});

	it("reconnects for the grace, then counts as down for as long as Stream keeps trying", () => {
		expect(chatStream({ held: false, isOnline: false, recovering: true })).toBe(
			"reconnecting"
		);
		expect(chatStream({ held: true, isOnline: false, recovering: true })).toBe(
			"down"
		);
	});

	it("is down when Stream is offline and not trying again", () => {
		expect(
			chatStream({ held: false, isOnline: false, recovering: false })
		).toBe("down");
	});
});
