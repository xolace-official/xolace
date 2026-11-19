import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/native-appearance", () => ({ LAUNCH_PHONE_SCHEME: "light" }));

const launchGlobal = globalThis as { __xolaceLaunchLeft?: boolean };

/** A fresh process: the store module loaded anew. */
async function boot() {
	vi.resetModules();
	launchGlobal.__xolaceLaunchLeft = undefined;
	const { useLaunch } = await import("./launch-store");
	return useLaunch;
}

describe("the launch store", () => {
	it("starts up, in the phone's scheme at launch", async () => {
		const useLaunch = await boot();
		expect(useLaunch.getState()).toMatchObject({
			holds: [],
			phase: "cover",
			scheme: "light",
		});
	});

	it("counts a release once, however often it's called", async () => {
		const useLaunch = await boot();
		const { hold } = useLaunch.getState();
		const first = hold("gate");
		hold("gate");
		first();
		first();
		expect(useLaunch.getState().holds).toEqual(["gate"]);
	});

	it("ignores a hold after the cover has left, but its release still clears a stale one", async () => {
		const useLaunch = await boot();
		const { hold, leave } = useLaunch.getState();
		// The gate was still loading when the cover timed out.
		hold("gate");
		leave();
		// A hold taken after launch is ignored: the list still has only the stale one.
		const late = hold("gate");
		expect(useLaunch.getState().holds).toEqual(["gate"]);
		// Releases go by reason, so the late hold's release clears the stale entry.
		late();
		expect(useLaunch.getState().holds).toEqual([]);
	});

	it("doesn't put the cover back up when a fast refresh remakes the store", async () => {
		const useLaunch = await boot();
		useLaunch.getState().leave();
		vi.resetModules();
		const { useLaunch: remade } = await import("./launch-store");
		expect(remade.getState().phase).toBe("gone");
	});
});
