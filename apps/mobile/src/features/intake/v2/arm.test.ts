import { beforeEach, describe, expect, it, vi } from "vitest";

// The arm is frozen per process; each test gets a fresh module.
let arm: typeof import("@/features/intake/v2/arm");
beforeEach(async () => {
	vi.resetModules();
	arm = await import("@/features/intake/v2/arm");
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
});
