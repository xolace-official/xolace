import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let arm: typeof import("@/features/intake/v2/arm");
beforeEach(async () => {
	vi.resetModules();
	arm = await import("@/features/intake/v2/arm");
	// The arm outlives the process, so each test clears what the last one kept.
	const { useAppStore } = await import("@/store/store");
	useAppStore.setState({ intakeArms: {} });
});

describe("freezeIntakeArm", () => {
	it.each([
		[true, "v2"],
		["test", "v2"],
		[false, "control"],
		["control", "control"],
		[undefined, "control"],
	] as const)("reads flag %s as %s", (flag, expected) => {
		expect(arm.freezeIntakeArm("profile_a", () => flag).arm).toBe(expected);
	});

	it("reads the flag once and keeps that arm for the session", () => {
		const read = vi.fn().mockReturnValueOnce(undefined).mockReturnValue(true);
		expect(arm.freezeIntakeArm("profile_a", read)).toEqual({
			arm: "control",
			fresh: true,
		});
		expect(arm.freezeIntakeArm("profile_a", read)).toEqual({
			arm: "control",
			fresh: false,
		});
		expect(read).toHaveBeenCalledTimes(1);
	});

	it("reads the flag again for the next account in the same process", () => {
		const read = vi.fn().mockReturnValueOnce(undefined).mockReturnValue(true);
		arm.freezeIntakeArm("profile_a", read);
		expect(arm.freezeIntakeArm("profile_b", read)).toEqual({
			arm: "v2",
			fresh: true,
		});
		expect(read).toHaveBeenCalledTimes(2);
	});

	it("keeps the arm across a cold kill, without reading or tracking it again", async () => {
		arm.freezeIntakeArm("profile_a", () => undefined);

		vi.resetModules();
		const relaunched = await import("@/features/intake/v2/arm");
		const read = vi.fn().mockReturnValue(true);

		expect(relaunched.freezeIntakeArm("profile_a", read)).toEqual({
			arm: "control",
			fresh: false,
		});
		expect(read).not.toHaveBeenCalled();
	});

	it("keeps each account's arm when they take turns on one device", () => {
		arm.freezeIntakeArm("profile_a", () => true);
		arm.freezeIntakeArm("profile_b", () => false);

		expect(arm.freezeIntakeArm("profile_a", () => false)).toEqual({
			arm: "v2",
			fresh: false,
		});
	});
});

describe("waitForIntakeFlag", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	const settled = (wait: Promise<void>) => {
		const state = { done: false };
		wait.then(() => {
			state.done = true;
		});
		return state;
	};

	it("holds until the flags load, so a quick tap reads the real flag", async () => {
		let flag: boolean | undefined;
		let finishLoad = () => {};
		const load = () =>
			new Promise<void>((resolve) => {
				finishLoad = () => {
					flag = true;
					resolve();
				};
			});

		const state = settled(arm.waitForIntakeFlag("profile_a", load));
		await vi.advanceTimersByTimeAsync(100);
		expect(state.done).toBe(false);

		finishLoad();
		await vi.advanceTimersByTimeAsync(0);
		expect(state.done).toBe(true);
		expect(arm.freezeIntakeArm("profile_a", () => flag).arm).toBe("v2");
	});

	it("stops waiting at the deadline when the flags never load", async () => {
		const state = settled(
			arm.waitForIntakeFlag("profile_a", () => new Promise(() => {}))
		);

		await vi.advanceTimersByTimeAsync(arm.INTAKE_FLAG_WAIT_MS - 1);
		expect(state.done).toBe(false);

		await vi.advanceTimersByTimeAsync(1);
		expect(state.done).toBe(true);
	});

	it("carries on when the load fails", async () => {
		await expect(
			arm.waitForIntakeFlag("profile_a", () =>
				Promise.reject(new Error("offline"))
			)
		).resolves.toBeUndefined();
	});

	it("doesn't load anything for an account that already has its arm", async () => {
		arm.freezeIntakeArm("profile_a", () => true);
		const load = vi.fn(() => new Promise(() => {}));

		await arm.waitForIntakeFlag("profile_a", load);

		expect(load).not.toHaveBeenCalled();
	});
});
