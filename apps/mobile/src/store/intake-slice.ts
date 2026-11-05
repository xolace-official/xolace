/** In-flight intake answers, and the arm each account was assigned. The answers aren't persisted:
 * a cold kill mid-intake restarts with an empty draft (T6, #263). The arm is, so that restart
 * lands in the same flow (#704). */

import type { api } from "@xolace/backend/convex/_generated/api";
import type { FunctionArgs } from "convex/server";
import type { IntakeArm } from "@/features/intake/v2/arm";

/** Keyed exactly like `intake.complete`'s args, so the two can't drift. */
export type IntakeAnswers = Partial<FunctionArgs<typeof api.intake.complete>>;

export type IntakeSlice = {
	intakeAnswers: IntakeAnswers;
	/** Shallow-merges one question's answer into the draft. */
	setIntakeAnswers: (patch: IntakeAnswers) => void;
	/** Called once `intake.complete` resolves. */
	resetIntakeAnswers: () => void;
	/** The `intake-v2` arm each account (by profile id) was assigned on this device. */
	intakeArms: Record<string, IntakeArm>;
	setIntakeArm: (account: string, arm: IntakeArm) => void;
};

type SetState = (partial: (s: IntakeSlice) => Partial<IntakeSlice>) => void;

export const createIntakeSlice = (set: SetState): IntakeSlice => ({
	intakeAnswers: {},
	intakeArms: {},
	resetIntakeAnswers: () => set(() => ({ intakeAnswers: {} })),
	setIntakeAnswers: (patch) =>
		set((s) => ({ intakeAnswers: { ...s.intakeAnswers, ...patch } })),
	setIntakeArm: (account, arm) =>
		set((s) => ({ intakeArms: { ...s.intakeArms, [account]: arm } })),
});

/** Keys persisted by the app store's `partialize`. */
export const intakePersistedKeys = (s: IntakeSlice) => ({
	intakeArms: s.intakeArms,
});
