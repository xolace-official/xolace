/**
 * In-flight post-signup intake answers. Deliberately NOT persisted (the store's
 * partialize whitelist covers theme/toggles only): a cold kill mid-intake
 * restarts at the founder message with an empty slice — no step cursor, no
 * half-written answers (T6, issue #263).
 */
import type { FunctionArgs } from 'convex/server';
import type { api } from '@/convex/_generated/api';

/** Keyed exactly like `intake.complete`'s args, so the two can't drift. */
export type IntakeAnswers = Partial<FunctionArgs<typeof api.intake.complete>>;

export type IntakeSlice = {
  intakeAnswers: IntakeAnswers;
  /** Shallow-merges one question's answer into the draft. */
  setIntakeAnswers: (patch: IntakeAnswers) => void;
  /** Called once `intake.complete` resolves. */
  resetIntakeAnswers: () => void;
};

type SetState = (
  partial: (s: IntakeSlice) => Partial<IntakeSlice>,
) => void;

export const createIntakeSlice = (set: SetState): IntakeSlice => ({
  intakeAnswers: {},
  setIntakeAnswers: (patch) =>
    set((s) => ({ intakeAnswers: { ...s.intakeAnswers, ...patch } })),
  resetIntakeAnswers: () => set(() => ({ intakeAnswers: {} })),
});
