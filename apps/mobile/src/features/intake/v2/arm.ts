/** Which intake a new user gets (#704). Read when the founder letter's CTA is tapped, the
 * last moment before the flows part, so the flag has had the letter's read to load. */

export const INTAKE_V2_FLAG = "intake-v2";

export type IntakeArm = "control" | "v2";

type FlagValue = string | boolean | undefined;

// Module-level: one arm per app process. A cold kill restarts intake at the founder letter,
// where the flag is read again.
let frozen: IntakeArm | null = null;

/**
 * The session's arm, reading the flag only the first time. An unresolved flag falls back to
 * control, the same rule as the intake paywall flag. `fresh` is true on that first read.
 */
export function freezeIntakeArm(read: () => FlagValue): {
	arm: IntakeArm;
	fresh: boolean;
} {
	if (frozen !== null) {
		return { arm: frozen, fresh: false };
	}
	const flag = read();
	frozen = flag === true || flag === "test" ? "v2" : "control";
	return { arm: frozen, fresh: true };
}
