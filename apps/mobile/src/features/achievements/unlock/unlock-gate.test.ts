import { describe, expect, it } from "vitest";
import { mayOpenUnlock } from "./unlock-gate";

const calmHome = { homeBusy: false, pathname: "/" };

describe("mayOpenUnlock", () => {
	it("opens on a calm home screen", () => {
		expect(mayOpenUnlock(calmHome)).toBe(true);
	});

	it("opens over an ordinary screen elsewhere in the app", () => {
		expect(mayOpenUnlock({ homeBusy: false, pathname: "/discovery" })).toBe(
			true
		);
		expect(mayOpenUnlock({ homeBusy: false, pathname: "/achievements" })).toBe(
			true
		);
	});

	it("waits while home is busy with a session, a sheet or the tour", () => {
		expect(mayOpenUnlock({ homeBusy: true, pathname: "/" })).toBe(false);
	});

	it("only lets home's busyness hold it back on home", () => {
		expect(mayOpenUnlock({ homeBusy: true, pathname: "/discovery" })).toBe(
			true
		);
	});

	it.each([
		"/crisis-resources",
		"/voice-vent",
		"/talk",
		"/sit-with-this",
		"/peer-reflections",
		"/session-end",
		"/trusted-bridge",
	])("never interrupts %s", (pathname) => {
		expect(mayOpenUnlock({ homeBusy: false, pathname })).toBe(false);
	});

	it.each([
		"/badge-unlock",
		"/follow-up",
		"/streak-held",
		"/kindling-announcement",
		"/browse-intro",
		"/upgrade",
		"/browse-player",
	])("never stacks on another full-screen moment (%s)", (pathname) => {
		expect(mayOpenUnlock({ homeBusy: false, pathname })).toBe(false);
	});

	it("treats a nested crisis route as crisis too", () => {
		expect(
			mayOpenUnlock({ homeBusy: false, pathname: "/crisis-resources/call" })
		).toBe(false);
	});
});
