import { api } from "@xolace/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
	hasCurrentVoiceConsent,
	VOICE_PROCESSING_CONSENT_VERSION,
} from "@/lib/consent/voice-processing-consent";

export function useVoiceProcessingConsent() {
	const current = useQuery(api.consent.getCurrentStatus, {
		consentType: "voice_processing",
	});
	const grant = useMutation(api.consent.grant);

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
