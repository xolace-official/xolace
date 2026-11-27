import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type ConnectionStart,
	createConnectionModel,
	CONNECTION_GRACE_MS as GRACE,
	internetOf,
	reachOf,
} from "./connection-model";

const ONLINE: ConnectionStart = {
	foreground: true,
	internet: "online",
	socketConnected: true,
};

beforeEach(() => {
	vi.useFakeTimers();
});
afterEach(() => {
	vi.useRealTimers();
});

describe("the connection model", () => {
	it("turns both flags on 3 seconds into an offline cold start, not before", () => {
		const model = createConnectionModel({
			foreground: true,
			internet: "offline",
			socketConnected: false,
		});
		vi.advanceTimersByTime(GRACE - 1);
		expect(model.flags()).toEqual({ cantReachXolace: false, offline: false });
		vi.advanceTimersByTime(1);
		expect(model.flags()).toEqual({ cantReachXolace: true, offline: true });
	});

	it("never turns a flag on for a blip under 3 seconds", () => {
		const model = createConnectionModel(ONLINE);
		model.send({ internet: "offline", type: "internet" });
		model.send({ connected: false, type: "socket" });
		vi.advanceTimersByTime(GRACE - 1);
		model.send({ internet: "online", type: "internet" });
		model.send({ connected: true, type: "socket" });
		vi.advanceTimersByTime(GRACE * 2);
		expect(model.flags()).toEqual({ cantReachXolace: false, offline: false });
	});

	it("clears both flags the moment the connection is back", () => {
		const model = createConnectionModel(ONLINE);
		model.send({ internet: "offline", type: "internet" });
		model.send({ connected: false, type: "socket" });
		vi.advanceTimersByTime(GRACE);
		expect(model.flags()).toEqual({ cantReachXolace: true, offline: true });
		model.send({ internet: "online", type: "internet" });
		model.send({ connected: true, type: "socket" });
		expect(model.flags()).toEqual({ cantReachXolace: false, offline: false });
	});

	it("restarts the timer when the app comes back to the foreground", () => {
		const model = createConnectionModel(ONLINE);
		model.send({ connected: false, type: "socket" });
		vi.advanceTimersByTime(GRACE);
		expect(model.flags().cantReachXolace).toBe(true);
		model.send({ type: "background" });
		vi.advanceTimersByTime(GRACE * 10);
		model.send({ type: "foreground" });
		expect(model.flags().cantReachXolace).toBe(false);
		vi.advanceTimersByTime(GRACE - 1);
		expect(model.flags().cantReachXolace).toBe(false);
		vi.advanceTimersByTime(1);
		expect(model.flags().cantReachXolace).toBe(true);
	});

	it("doesn't let a timer started before the background finish after it", () => {
		const model = createConnectionModel(ONLINE);
		model.send({ internet: "offline", type: "internet" });
		vi.advanceTimersByTime(GRACE - 1);
		model.send({ type: "background" });
		model.send({ type: "foreground" });
		vi.advanceTimersByTime(GRACE - 1);
		expect(model.flags().offline).toBe(false);
		vi.advanceTimersByTime(1);
		expect(model.flags().offline).toBe(true);
	});

	it("never counts unknown internet as offline", () => {
		const model = createConnectionModel({ ...ONLINE, internet: "unknown" });
		model.send({ internet: "unknown", type: "internet" });
		vi.advanceTimersByTime(GRACE * 10);
		expect(model.flags()).toEqual({ cantReachXolace: false, offline: false });
	});

	it("counts Wi-Fi confirmed to have no internet as offline after 3 seconds", () => {
		const model = createConnectionModel(ONLINE);
		model.send({
			internet: internetOf({ isConnected: true, isInternetReachable: false }),
			type: "internet",
		});
		vi.advanceTimersByTime(GRACE);
		expect(model.flags()).toEqual({ cantReachXolace: true, offline: true });
	});

	it("turns can't reach Xolace on with offline, before the socket notices", () => {
		const model = createConnectionModel(ONLINE);
		model.send({ internet: "offline", type: "internet" });
		vi.advanceTimersByTime(GRACE);
		expect(model.flags()).toEqual({ cantReachXolace: true, offline: true });
	});

	it("leaves offline false when only Xolace can't be reached", () => {
		const model = createConnectionModel(ONLINE);
		model.send({ connected: false, type: "socket" });
		vi.advanceTimersByTime(GRACE);
		expect(model.flags()).toEqual({ cantReachXolace: true, offline: false });
	});
});

describe("listening to the model", () => {
	it("tells subscribers when a flag turns on or off, and only then", () => {
		const model = createConnectionModel(ONLINE);
		const heard = vi.fn();
		model.subscribe(heard);
		model.send({ connected: false, type: "socket" });
		model.send({ internet: "unknown", type: "internet" });
		expect(heard).not.toHaveBeenCalled();
		vi.advanceTimersByTime(GRACE);
		expect(heard).toHaveBeenCalledOnce();
		model.send({ connected: true, type: "socket" });
		expect(heard).toHaveBeenCalledTimes(2);
	});

	it("does nothing once stopped", () => {
		const model = createConnectionModel(ONLINE);
		const heard = vi.fn();
		model.subscribe(heard);
		model.send({ connected: false, type: "socket" });
		model.stop();
		model.send({ internet: "offline", type: "internet" });
		vi.advanceTimersByTime(GRACE * 2);
		expect(heard).not.toHaveBeenCalled();
		expect(model.flags().cantReachXolace).toBe(false);
	});
});

describe("reading the internet from NetInfo", () => {
	it("is offline with no network, or Wi-Fi confirmed to have no internet", () => {
		expect(internetOf({ isConnected: false, isInternetReachable: false })).toBe(
			"offline"
		);
		expect(internetOf({ isConnected: true, isInternetReachable: false })).toBe(
			"offline"
		);
	});

	it("is online once the internet is confirmed", () => {
		expect(internetOf({ isConnected: true, isInternetReachable: true })).toBe(
			"online"
		);
	});

	it("is unknown until NetInfo has read the network or the internet", () => {
		expect(internetOf({ isConnected: null, isInternetReachable: null })).toBe(
			"unknown"
		);
		expect(internetOf({ isConnected: true, isInternetReachable: null })).toBe(
			"unknown"
		);
	});
});

describe("one answer for copy that names the cause", () => {
	it("names offline first, since being offline is why Xolace can't be reached", () => {
		expect(reachOf({ cantReachXolace: true, offline: true })).toBe("offline");
		expect(reachOf({ cantReachXolace: true, offline: false })).toBe(
			"cant_reach"
		);
		expect(reachOf({ cantReachXolace: false, offline: false })).toBe(
			"reachable"
		);
	});
});
