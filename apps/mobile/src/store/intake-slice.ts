/** In-flight intake answers. Not persisted: a cold kill mid-intake restarts with an empty slice
 * (T6, #263). */

import type { api } from "@xolace/backend/convex/_generated/api";
import type { FunctionArgs } from "convex/server";

/** Keyed exactly like `intake.complete`'s args, so the two can't drift. */
export type IntakeAnswers = Partial<FunctionArgs<typeof api.intake.complete>>;

export type IntakeSlice = {
	intakeAnswers: IntakeAnswers;
	/** Shallow-merges one question's answer into the draft. */
	setIntakeAnswers: (patch: IntakeAnswers) => void;
	/** Called once `intake.complete` resolves. */
	resetIntakeAnswers: () => void;
};

type SetState = (partial: (s: IntakeSlice) => Partial<IntakeSlice>) => void;

export const createIntakeSlice = (set: SetState): IntakeSlice => ({
	intakeAnswers: {},
	resetIntakeAnswers: () => set(() => ({ intakeAnswers: {} })),
	setIntakeAnswers: (patch) =>
		set((s) => ({ intakeAnswers: { ...s.intakeAnswers, ...patch } })),
});
