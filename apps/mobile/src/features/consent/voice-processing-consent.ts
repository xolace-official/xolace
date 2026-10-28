import type { api } from "@xolace/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

/** Bump whenever the consent wording changes; anyone holding an older grant is re-consented on
 * their next recording. */
export const VOICE_PROCESSING_CONSENT_VERSION = "2.0";

// undefined while the query loads.
type ConsentStatus =
	| FunctionReturnType<typeof api.consent.getCurrentStatus>
	| undefined;

export function hasCurrentVoiceConsent(current: ConsentStatus): boolean {
	return (
		current?.status === "granted" &&
		current.consentLanguageVersion === VOICE_PROCESSING_CONSENT_VERSION
	);
}
