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
		expect(arm.freezeIntakeArm(() => flag).arm).toBe(expected);
	});

	it("reads the flag once and keeps that arm for the session", () => {
		const read = vi.fn().mockReturnValueOnce(undefined).mockReturnValue(true);
		expect(arm.freezeIntakeArm(read)).toEqual({ arm: "control", fresh: true });
		expect(arm.freezeIntakeArm(read)).toEqual({
			arm: "control",
			fresh: false,
		});
		expect(read).toHaveBeenCalledTimes(1);
	});
});
