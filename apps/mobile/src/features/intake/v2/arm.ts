/** Which intake a new user gets (#704). Read when the founder letter's CTA is tapped, the
 * last moment before the flows part, after waiting briefly for the flag to load. */

import { useAppStore } from "@/store/store";

export const INTAKE_V2_FLAG = "intake-v2";

export type IntakeArm = "control" | "v2";

/** Long enough for a flag request and the one it may queue behind, short enough not to strand
 * someone on a CTA that doesn't respond. */
export const INTAKE_FLAG_WAIT_MS = 1500;

type FlagValue = string | boolean | undefined;

/**
 * Holds the CTA until `load` brings the flag in, or the deadline passes. Never rejects: without
 * the flag, `freezeIntakeArm` falls back to control. An account with an arm has nothing to wait
 * for, since its flag is never read again.
 */
export async function waitForIntakeFlag(
	account: string,
	load: () => Promise<unknown>
): Promise<void> {
	if (useAppStore.getState().intakeArms[account]) {
		return;
	}
	let timer: ReturnType<typeof setTimeout> | undefined;
	const deadline = new Promise<void>((resolve) => {
		timer = setTimeout(resolve, INTAKE_FLAG_WAIT_MS);
	});
	await Promise.race([load().catch(() => undefined), deadline]);
	clearTimeout(timer);
}

/**
 * The account's arm, reading the flag only the first time. An unresolved flag falls back to
 * control, the same rule as the intake paywall flag. The arm is kept on the device, since a
 * cold kill restarts intake at the founder letter and a flag that has loaded by then could
 * otherwise move the account to the other flow. `fresh` is true on that first read, so each
 * account's assignment is tracked once.
 */
export function freezeIntakeArm(
	account: string,
	read: () => FlagValue
): { arm: IntakeArm; fresh: boolean } {
	const { intakeArms, setIntakeArm } = useAppStore.getState();
	const kept = intakeArms[account];
	if (kept) {
		return { arm: kept, fresh: false };
	}
	const flag = read();
	const arm = flag === true || flag === "test" ? "v2" : "control";
	setIntakeArm(account, arm);
	return { arm, fresh: true };
}
