import { INTAKE_V2_VERSION } from "@xolace/backend/convex/lib/validators";

/** The v2 intake drops its shake step; the tip waits for this session (#712). */
const V2_TIP_AFTER_SESSION = 3;

/**
 * Whether the one-time "shake to send feedback" toast may show yet. Nothing
 * shows before onboarding is done, when the intake arm isn't known; after the
 * v1 intake (which taught shaking in its own step) or for an account from
 * before intake answers were stored, it shows straight away; after v2 only
 * from the third session, when there's something to say.
 */
export function shakeTipDue(
	account:
		| {
				intakeVersion: number | undefined;
				onboarded: boolean;
				sessionCount: number;
		  }
		| undefined
): boolean {
	if (!account?.onboarded) {
		return false;
	}
	if (account.intakeVersion === INTAKE_V2_VERSION) {
		return account.sessionCount >= V2_TIP_AFTER_SESSION;
	}
	return true;
}
