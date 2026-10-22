import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
  hasCurrentVoiceConsent,
  VOICE_PROCESSING_CONSENT_VERSION,
} from '@/src/features/consent/voice-processing-consent';

/**
 * The gate in front of anything that sends recorded audio to ElevenLabs.
 * `ensureConsent` resolves once current `voice_processing` consent is on
 * record and rejects if it can't be written — so audio must not be sent
 * until it resolves.
 */
export function useVoiceProcessingConsent() {
  const current = useQuery(api.consent.getCurrentStatus, {
    consentType: 'voice_processing',
  });
  const grant = useMutation(api.consent.grant);

  // A still-loading query grants again; the log is append-only, so a
  // duplicate grant is harmless.
  const ensureConsent = async () => {
    if (hasCurrentVoiceConsent(current)) return;
    await grant({
      consentType: 'voice_processing',
      consentLanguageVersion: VOICE_PROCESSING_CONSENT_VERSION,
    });
  };

  return { ensureConsent };
}
