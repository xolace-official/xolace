/**
 * Dev builds only: the letters a dev build's live adapter starts with
 * (`features/letters/letters-memory.ts` requires this behind `__DEV__`, so a release build
 * never bundles the fixtures). Goes with the fixtures when S21 wires the contract.
 * @public Reached through letters-memory.ts's `__DEV__` require, which knip can't follow.
 */
export { SEED } from "@/features/letters/dev/fixtures";
