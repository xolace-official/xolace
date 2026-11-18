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
	introSeen: false,
	onboardingComplete: undefined,
};
const SIGNED_IN = { ...SIGNED_OUT, authenticated: true };

/** Every input the gate can see, signed in or out, loading or not. */
function* everyInput(): Generator<RootGateInput> {
	for (const authLoading of [true, false]) {
		for (const authenticated of [true, false]) {
			for (const introSeen of [true, false]) {
				for (const onboardingComplete of [true, false, undefined]) {
					yield { authenticated, authLoading, introSeen, onboardingComplete };
				}
			}
		}
	}
}

describe("rootGate", () => {
	it("waits while Convex checks the token, whatever else it knows", () => {
		expect(rootGate({ ...SIGNED_IN, authLoading: true })).toBe("loading");
		expect(
			rootGate({ ...SIGNED_OUT, authLoading: true, introSeen: true })
		).toBe("loading");
	});

	it("opens the promise for someone signed out who hasn't seen it", () => {
		expect(rootGate(SIGNED_OUT)).toBe("(onboarding)");
	});

	it("opens sign-in for someone signed out who has seen the promise", () => {
		expect(rootGate({ ...SIGNED_OUT, introSeen: true })).toBe("(auth)");
	});

	it("treats a Clerk session Convex hasn't accepted as signed out", () => {
		// The layout passes Convex's view; a desync never opens intake or the app.
		expect(rootGate({ ...SIGNED_OUT, onboardingComplete: true })).toBe(
			"(onboarding)"
		);
	});

	it("waits for the gate query once signed in, rather than guess a group", () => {
		expect(rootGate(SIGNED_IN)).toBe("loading");
		expect(rootGate({ ...SIGNED_IN, introSeen: true })).toBe("loading");
	});

	it("sends someone signed in without intake to intake, on any device", () => {
		expect(rootGate({ ...SIGNED_IN, onboardingComplete: false })).toBe(
			"(intake)"
		);
		expect(
			rootGate({ ...SIGNED_IN, introSeen: true, onboardingComplete: false })
		).toBe("(intake)");
	});

	it("lets an onboarded account straight in, even on a new device", () => {
		// A fresh install has never seen the promise; the server's answer wins.
		expect(rootGate({ ...SIGNED_IN, onboardingComplete: true })).toBe(
			"(protected)"
		);
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
				expect(["loading", "(onboarding)", "(auth)"]).toContain(
					rootGate(input)
				);
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
