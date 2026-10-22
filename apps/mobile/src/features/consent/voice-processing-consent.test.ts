import { describe, expect, it } from 'vitest';
import { hasCurrentVoiceConsent } from '@/src/features/consent/voice-processing-consent';

const record = (status: 'granted' | 'revoked', consentLanguageVersion: string) => ({
  status,
  consentLanguageVersion,
  createdAt: 0,
});

describe('hasCurrentVoiceConsent', () => {
  it('holds for a v2.0 grant', () => {
    expect(hasCurrentVoiceConsent(record('granted', '2.0'))).toBe(true);
  });

  it('re-consents a v1.0 grant', () => {
    expect(hasCurrentVoiceConsent(record('granted', '1.0'))).toBe(false);
  });

  it('re-consents after a revoke', () => {
    expect(hasCurrentVoiceConsent(record('revoked', '2.0'))).toBe(false);
  });

  it('treats no record or a loading query as no consent', () => {
    expect(hasCurrentVoiceConsent(null)).toBe(false);
    expect(hasCurrentVoiceConsent(undefined)).toBe(false);
  });
});
