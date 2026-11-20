import { INTAKE_V2_VERSION } from "@xolace/backend/convex/lib/validators";

const V2_TIP_AFTER_SESSION = 3;

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
