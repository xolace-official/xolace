import { useConvexAuth, useQuery } from "convex/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useOSReducedMotion } from "./os-reduced-motion";
import {
	isReducedMotion,
	type MotionPreference,
	resolveMotionPreference,
	useEffectiveReducedMotion,
} from "./use-effective-reduced-motion";

vi.mock("@xolace/backend/convex/_generated/api", () => ({
	api: { preferences: { get: "preferences.get" } },
}));
vi.mock("convex/react", () => ({ useConvexAuth: vi.fn(), useQuery: vi.fn() }));
vi.mock("./os-reduced-motion", () => ({ useOSReducedMotion: vi.fn() }));
const store = vi.hoisted(() => ({ accountPending: false }));
vi.mock("@/store/store", () => ({
	useAppStore: (pick: (s: typeof store) => unknown) => pick(store),
}));

/**
 * The redesign's motion helpers take `reduced` from this one resolver. The prototype read the
 * OS setting with a Review-menu override; production's in-app preference takes that place, so
 * a forced choice wins over the OS either way.
 */
describe("reduced motion: the in-app preference, then the OS", () => {
	const cases: [MotionPreference, boolean, boolean][] = [
		["system", false, false],
		["system", true, true],
		["reduced", false, true],
		["reduced", true, true],
		["full", false, false],
		["full", true, false],
	];
	for (const [preference, os, reduced] of cases) {
		it(`${preference} with the OS setting ${os ? "on" : "off"} → ${reduced ? "reduced" : "full"}`, () => {
			expect(isReducedMotion(preference, os)).toBe(reduced);
		});
	}

	it("reads the stored tri-state first, then the legacy boolean, else follows the OS", () => {
		expect(resolveMotionPreference("full", true)).toBe("full");
		expect(resolveMotionPreference(undefined, true)).toBe("reduced");
		expect(resolveMotionPreference(undefined, false)).toBe("system");
		expect(resolveMotionPreference(undefined, undefined)).toBe("system");
	});
});

// The hook only calls other hooks, all mocked here, so it runs as a plain function.
describe("useEffectiveReducedMotion", () => {
	const signedIn = (isAuthenticated: boolean) =>
		vi.mocked(useConvexAuth).mockReturnValue({
			isAuthenticated,
			isLoading: false,
			isRefreshing: false,
		});

	beforeEach(() => {
		vi.mocked(useQuery).mockReset();
		vi.mocked(useOSReducedMotion).mockReturnValue(true);
		store.accountPending = false;
	});

	it("signed out: skips preferences.get (it requires auth) and follows the OS", () => {
		signedIn(false);
		expect(useEffectiveReducedMotion()).toBe(true);
		expect(useQuery).toHaveBeenCalledWith("preferences.get", "skip");
	});

	it("signed in: reads preferences.get, and its choice wins over the OS", () => {
		signedIn(true);
		vi.mocked(useQuery).mockReturnValue({ motionPreference: "full" });
		expect(useEffectiveReducedMotion()).toBe(false);
		expect(useQuery).toHaveBeenCalledWith("preferences.get", {});
	});

	it("signed in, account still being made: skips preferences.get and follows the OS", () => {
		signedIn(true);
		store.accountPending = true;
		expect(useEffectiveReducedMotion()).toBe(true);
		expect(useQuery).toHaveBeenCalledWith("preferences.get", "skip");
	});

	it("signed in, preferences still loading: follows the OS", () => {
		signedIn(true);
		vi.mocked(useQuery).mockReturnValue(undefined);
		expect(useEffectiveReducedMotion()).toBe(true);
	});
});
