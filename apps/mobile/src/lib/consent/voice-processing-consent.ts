import type { api } from "@xolace/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

export const VOICE_PROCESSING_CONSENT_VERSION = "2.0";

type ConsentStatus =
	| FunctionReturnType<typeof api.consent.getCurrentStatus>
	| undefined;

export function hasCurrentVoiceConsent(current: ConsentStatus): boolean {
	return (
		current?.status === "granted" &&
		current.consentLanguageVersion === VOICE_PROCESSING_CONSENT_VERSION
	);
}
