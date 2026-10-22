/** Canonical list of haptic pattern names — single source of truth. */
export const hapticNames = [
  'processingBreath',
  'gentlePresence',
  'mirrorArrival',
  'sessionComplete',
  'resonanceToggle',
  'pathChoice',
  'textureSelect',
  'typingBegin',
  'softPress',
  'affirmativePress',
  'errorNotice',
  'compassionateHold',
  'onboardingEntrance',
  'homeEntrance',
  'softenPulse',
  'followUpEntrance',
] as const;

export type HapticName = (typeof hapticNames)[number];

/** Breath phase kinds — consumed by `playBreathPhase` from the PacedOrb runner. */
export type BreathPhase = 'inhale' | 'top' | 'exhale';
