import { api } from "@xolace/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
	hasCurrentVoiceConsent,
	VOICE_PROCESSING_CONSENT_VERSION,
} from "@/features/consent/voice-processing-consent";

/** Gate before any audio goes to ElevenLabs: `ensureConsent` resolves once consent is on
 * record; send nothing before then. */
export function useVoiceProcessingConsent() {
	const current = useQuery(api.consent.getCurrentStatus, {
		consentType: "voice_processing",
	});
	const grant = useMutation(api.consent.grant);

	// A still-loading query grants again; the log is append-only, so a
	// duplicate grant is harmless.
	const ensureConsent = async () => {
		if (hasCurrentVoiceConsent(current)) {
			return;
		}
		await grant({
			consentLanguageVersion: VOICE_PROCESSING_CONSENT_VERSION,
			consentType: "voice_processing",
		});
	};

	return { ensureConsent };
}
