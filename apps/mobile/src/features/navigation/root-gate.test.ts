import { describe, expect, it } from "vitest";
import {
	isGroupOpen,
	ROOT_GROUPS,
	type RootGateInput,
	rootGate,
} from "@/features/navigation/root-gate";

const SIGNED_OUT: RootGateInput = {
	authenticated: false,
	authLoading: false,
	onboardingComplete: undefined,
	seatHeld: false,
};
const SIGNED_IN = { ...SIGNED_OUT, authenticated: true };

/** Every input the gate can see, signed in or out, loading or not, held or not. */
function* everyInput(): Generator<RootGateInput> {
	for (const authLoading of [true, false]) {
		for (const authenticated of [true, false]) {
			for (const seatHeld of [true, false]) {
				for (const onboardingComplete of [true, false, undefined]) {
					yield { authenticated, authLoading, onboardingComplete, seatHeld };
				}
			}
		}
	}
}

describe("rootGate", () => {
	it("waits while Convex checks the token, whatever else it knows", () => {
		expect(rootGate({ ...SIGNED_IN, authLoading: true })).toBe("loading");
		expect(rootGate({ ...SIGNED_OUT, authLoading: true })).toBe("loading");
	});

	it("opens first run for someone signed out", () => {
		expect(rootGate(SIGNED_OUT)).toBe("(first-run)");
	});

	it("treats a Clerk session Convex hasn't accepted as signed out", () => {
		// The layout passes Convex's view; a desync never opens intake or the app.
		expect(rootGate({ ...SIGNED_OUT, onboardingComplete: true })).toBe(
			"(first-run)"
		);
	});

	it("waits for the gate query once signed in, rather than guess a group", () => {
		expect(rootGate(SIGNED_IN)).toBe("loading");
	});

	it("sends someone signed in without intake to intake, on any device", () => {
		expect(rootGate({ ...SIGNED_IN, onboardingComplete: false })).toBe(
			"(intake)"
		);
	});

	it("lets an onboarded account straight in, even on a new device", () => {
		expect(rootGate({ ...SIGNED_IN, onboardingComplete: true })).toBe(
			"(protected)"
		);
	});

	it("keeps first run on screen while the seat holds after sign-in", () => {
		const held = { ...SIGNED_IN, seatHeld: true };
		expect(rootGate(held)).toBe("(first-run)");
		expect(rootGate({ ...held, onboardingComplete: false })).toBe(
			"(first-run)"
		);
		// A token refresh mid-seat doesn't swap the seat for the loader.
		expect(rootGate({ ...held, authLoading: true })).toBe("(first-run)");
	});

	it("goes on to intake as soon as the seat lets go", () => {
		const seated = { ...SIGNED_IN, onboardingComplete: false };
		expect(rootGate({ ...seated, seatHeld: true })).toBe("(first-run)");
		expect(rootGate({ ...seated, seatHeld: false })).toBe("(intake)");
	});

	it("doesn't hold an account that already finished intake", () => {
		expect(
			rootGate({ ...SIGNED_IN, onboardingComplete: true, seatHeld: true })
		).toBe("(protected)");
	});

	it("never opens the app for someone signed in who hasn't finished intake", () => {
		for (const input of everyInput()) {
			if (input.onboardingComplete !== true) {
				expect(rootGate(input)).not.toBe("(protected)");
			}
		}
	});

	it("never opens intake or the app for someone signed out", () => {
		for (const input of everyInput()) {
			if (!input.authenticated) {
				expect(["loading", "(first-run)"]).toContain(rootGate(input));
			}
		}
	});

	it("opens the app only once Convex has settled on an onboarded account", () => {
		for (const input of everyInput()) {
			if (rootGate(input) === "(protected)") {
				expect(input).toMatchObject({
					authenticated: true,
					authLoading: false,
					onboardingComplete: true,
				});
			}
		}
	});

	it("opens exactly one group, or none while loading, for every input", () => {
		for (const input of everyInput()) {
			const gate = rootGate(input);
			const open = ROOT_GROUPS.filter((group) => isGroupOpen(gate, group));
			expect(open).toHaveLength(gate === "loading" ? 0 : 1);
		}
	});
});
