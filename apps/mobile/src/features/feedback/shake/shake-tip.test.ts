import {
	INTAKE_V2_VERSION,
	INTAKE_VERSION,
} from "@xolace/backend/convex/lib/validators";
import { describe, expect, it } from "vitest";
import { shakeTipDue } from "./shake-tip";

describe("shakeTipDue", () => {
	it("waits while the account is still loading", () => {
		expect(shakeTipDue(undefined)).toBe(false);
	});

	it("waits through the intake, before the arm is known", () => {
		expect(
			shakeTipDue({
				intakeVersion: undefined,
				onboarded: false,
				sessionCount: 0,
			})
		).toBe(false);
	});

	it("shows straight away after the v1 intake, which has its own shake step", () => {
		expect(
			shakeTipDue({
				intakeVersion: INTAKE_VERSION,
				onboarded: true,
				sessionCount: 0,
			})
		).toBe(true);
	});

	it("shows straight away for an account onboarded before intake answers were stored", () => {
		expect(
			shakeTipDue({
				intakeVersion: undefined,
				onboarded: true,
				sessionCount: 0,
			})
		).toBe(true);
	});

	it("holds a v2 user's tip until their third session", () => {
		const v2 = { intakeVersion: INTAKE_V2_VERSION, onboarded: true };
		expect(shakeTipDue({ ...v2, sessionCount: 2 })).toBe(false);
		expect(shakeTipDue({ ...v2, sessionCount: 3 })).toBe(true);
	});
});
