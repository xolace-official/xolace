import type { HapticPatternData } from '@/modules/native-core-haptics';

/**
 * Xolace haptic patterns — designed for emotional processing.
 * Warm and present, never aggressive or gamified.
 */

// ── Presence Patterns ────────────────────────────────────────────────

/** Mirrors BreathingOrb's inhale/exhale. Plays once on processing-state mount. */
export const processingBreath: HapticPatternData = {
  events: [
    {
      eventType: 'hapticContinuous',
      time: 0.0,
      eventDuration: 3.0,
      parameters: [
        { parameterID: 'hapticIntensity', value: 0.6 },
        { parameterID: 'hapticSharpness', value: 0.2 },
      ],
    },
  ],
  parameterCurves: [
    {
      parameterID: 'hapticIntensityControl',
      relativeTime: 0.0,
      controlPoints: [
        { relativeTime: 0.0, value: 0.3 },
        { relativeTime: 0.75, value: 0.8 },
        { relativeTime: 1.5, value: 1.0 },
        { relativeTime: 2.25, value: 0.8 },
        { relativeTime: 3.0, value: 0.0 },
      ],
    },
  ],
};

/** Soft acknowledgment. Onboarding transitions. */
export const gentlePresence: HapticPatternData = {
  events: [
    {
      eventType: 'hapticTransient',
      time: 0.0,
      parameters: [
        { parameterID: 'hapticIntensity', value: 0.6 },
        { parameterID: 'hapticSharpness', value: 0.35 },
      ],
    },
  ],
};

// ── Validation Patterns ──────────────────────────────────────────────

/** Three-beat crescendo. "You've been heard." Peak haptic moment. Mirror-state mount. */
export const mirrorArrival: HapticPatternData = {
  events: [
    {
      eventType: 'hapticTransient',
      time: 0.0,
      parameters: [
        { parameterID: 'hapticIntensity', value: 0.5 },
        { parameterID: 'hapticSharpness', value: 0.25 },
      ],
    },
    {
      eventType: 'hapticTransient',
      time: 0.1,
      parameters: [
        { parameterID: 'hapticIntensity', value: 0.7 },
        { parameterID: 'hapticSharpness', value: 0.35 },
      ],
    },
    {
      eventType: 'hapticTransient',
      time: 0.2,
      parameters: [
        { parameterID: 'hapticIntensity', value: 0.95 },
        { parameterID: 'hapticSharpness', value: 0.5 },
      ],
    },
  ],
};

/** Two-beat period. Session-end mount. */
export const sessionComplete: HapticPatternData = {
  events: [
    {
      eventType: 'hapticTransient',
      time: 0.0,
      parameters: [
        { parameterID: 'hapticIntensity', value: 0.75 },
        { parameterID: 'hapticSharpness', value: 0.4 },
      ],
    },
    {
      eventType: 'hapticContinuous',
      time: 0.2,
      eventDuration: 0.3,
      parameters: [
        { parameterID: 'hapticIntensity', value: 0.6 },
        { parameterID: 'hapticSharpness', value: 0.2 },
      ],
    },
  ],
  parameterCurves: [
    {
      parameterID: 'hapticIntensityControl',
      relativeTime: 0.2,
      controlPoints: [
        { relativeTime: 0.0, value: 1.0 },
        { relativeTime: 0.3, value: 0.0 },
      ],
    },
  ],
};

/** Warm transient for peer resonance toggle. */
export const resonanceToggle: HapticPatternData = {
  events: [
    {
      eventType: 'hapticTransient',
      time: 0.0,
      parameters: [
        { parameterID: 'hapticIntensity', value: 0.7 },
        { parameterID: 'hapticSharpness', value: 0.35 },
      ],
    },
  ],
};

// ── Transition Patterns ──────────────────────────────────────────────

/** Two-beat commitment. Path-selection button presses. */
export const pathChoice: HapticPatternData = {
  events: [
    {
      eventType: 'hapticTransient',
      time: 0.0,
      parameters: [
        { parameterID: 'hapticIntensity', value: 0.6 },
        { parameterID: 'hapticSharpness', value: 0.35 },
      ],
    },
    {
      eventType: 'hapticTransient',
      time: 0.08,
      parameters: [
        { parameterID: 'hapticIntensity', value: 0.8 },
        { parameterID: 'hapticSharpness', value: 0.45 },
      ],
    },
  ],
};

/** Naming a feeling — slightly crisp. Texture tag toggles. */
export const textureSelect: HapticPatternData = {
  events: [
    {
      eventType: 'hapticTransient',
      time: 0.0,
      parameters: [
        { parameterID: 'hapticIntensity', value: 0.65 },
        { parameterID: 'hapticSharpness', value: 0.45 },
      ],
    },
  ],
};

/** Placing your hand on a surface. Tap-to-type press. */
export const typingBegin: HapticPatternData = {
  events: [
    {
      eventType: 'hapticTransient',
      time: 0.0,
      parameters: [
        { parameterID: 'hapticIntensity', value: 0.6 },
        { parameterID: 'hapticSharpness', value: 0.3 },
      ],
    },
  ],
};

// ── Micro-interactions ───────────────────────────────────────────────

/** Default button press. Dismiss, navigation, secondary actions. */
export const softPress: HapticPatternData = {
  events: [
    {
      eventType: 'hapticTransient',
      time: 0.0,
      parameters: [
        { parameterID: 'hapticIntensity', value: 0.6 },
        { parameterID: 'hapticSharpness', value: 0.4 },
      ],
    },
  ],
};

/** Primary action press. "That's it", "Let it out", OAuth sign-in. */
export const affirmativePress: HapticPatternData = {
  events: [
    {
      eventType: 'hapticTransient',
      time: 0.0,
      parameters: [
        { parameterID: 'hapticIntensity', value: 0.8 },
        { parameterID: 'hapticSharpness', value: 0.45 },
      ],
    },
  ],
};

// ── Utility Patterns ─────────────────────────────────────────────────

/** Sharp double-tap. Error-state mount. Distinct from emotional vocabulary. */
export const errorNotice: HapticPatternData = {
  events: [
    {
      eventType: 'hapticTransient',
      time: 0.0,
      parameters: [
        { parameterID: 'hapticIntensity', value: 0.8 },
        { parameterID: 'hapticSharpness', value: 0.7 },
      ],
    },
    {
      eventType: 'hapticTransient',
      time: 0.06,
      parameters: [
        { parameterID: 'hapticIntensity', value: 0.8 },
        { parameterID: 'hapticSharpness', value: 0.7 },
      ],
    },
  ],
};

/** Deeply round fade. Gave-up state mount. "Even this is okay." */
export const compassionateHold: HapticPatternData = {
  events: [
    {
      eventType: 'hapticContinuous',
      time: 0.0,
      eventDuration: 0.5,
      parameters: [
        { parameterID: 'hapticIntensity', value: 0.6 },
        { parameterID: 'hapticSharpness', value: 0.15 },
      ],
    },
  ],
  parameterCurves: [
    {
      parameterID: 'hapticIntensityControl',
      relativeTime: 0.0,
      controlPoints: [
        { relativeTime: 0.0, value: 1.0 },
        { relativeTime: 0.3, value: 0.6 },
        { relativeTime: 0.5, value: 0.0 },
      ],
    },
  ],
};

/** Single warm pulse. Soften-toward-it haptic beat — holds space without startling. */
export const softenPulse: HapticPatternData = {
  events: [
    {
      eventType: 'hapticContinuous',
      time: 0.0,
      eventDuration: 0.8,
      parameters: [
        { parameterID: 'hapticIntensity', value: 0.55 },
        { parameterID: 'hapticSharpness', value: 0.18 },
      ],
    },
  ],
  parameterCurves: [
    {
      parameterID: 'hapticIntensityControl',
      relativeTime: 0.0,
      controlPoints: [
        { relativeTime: 0.0, value: 0.4 },
        { relativeTime: 0.4, value: 1.0 },
        { relativeTime: 0.8, value: 0.0 },
      ],
    },
  ],
};

// ── Entrance Patterns ───────────────────────────────────────────────

/** Synced with PromiseScreen's staggered FadeInDown. First thing the user feels. */
export const onboardingEntrance: HapticPatternData = {
  events: [
    {
      eventType: 'hapticTransient',
      time: 0.0,
      parameters: [
        { parameterID: 'hapticIntensity', value: 0.3 },
        { parameterID: 'hapticSharpness', value: 0.2 },
      ],
    },
    {
      eventType: 'hapticTransient',
      time: 0.3,
      parameters: [
        { parameterID: 'hapticIntensity', value: 0.45 },
        { parameterID: 'hapticSharpness', value: 0.3 },
      ],
    },
    {
      eventType: 'hapticTransient',
      time: 0.6,
      parameters: [
        { parameterID: 'hapticIntensity', value: 0.6 },
        { parameterID: 'hapticSharpness', value: 0.35 },
      ],
    },
    {
      eventType: 'hapticContinuous',
      time: 0.8,
      eventDuration: 0.3,
      parameters: [
        { parameterID: 'hapticIntensity', value: 0.25 },
        { parameterID: 'hapticSharpness', value: 0.15 },
      ],
    },
  ],
  parameterCurves: [
    {
      parameterID: 'hapticIntensityControl',
      relativeTime: 0.8,
      controlPoints: [
        { relativeTime: 0.0, value: 1.0 },
        { relativeTime: 0.3, value: 0.0 },
      ],
    },
  ],
};

// ── Breath Patterns ─────────────────────────────────────────────────
// Sync with PacedOrb phases. Continuous intensity curves swell with the
// inhale and release with the exhale; the physiological-sigh "top-up"
// is the only transient — it's the pattern's defining feature.

/** Warm swell matching orb expansion. Duration matches the inhale phase. */
export function breathInhalePattern(durationSeconds: number): HapticPatternData {
  return {
    events: [
      {
        eventType: 'hapticContinuous',
        time: 0.0,
        eventDuration: durationSeconds,
        parameters: [
          { parameterID: 'hapticIntensity', value: 0.65 },
          { parameterID: 'hapticSharpness', value: 0.15 },
        ],
      },
    ],
    parameterCurves: [
      {
        parameterID: 'hapticIntensityControl',
        relativeTime: 0.0,
        controlPoints: [
          { relativeTime: 0.0, value: 0.35 },
          { relativeTime: durationSeconds * 0.7, value: 0.9 },
          { relativeTime: durationSeconds, value: 1.0 },
        ],
      },
    ],
  };
}

/** Tiny second-inhale pop — physiological sigh's signature. */
export const breathTopHold: HapticPatternData = {
  events: [
    {
      eventType: 'hapticTransient',
      time: 0.0,
      parameters: [
        { parameterID: 'hapticIntensity', value: 0.5 },
        { parameterID: 'hapticSharpness', value: 0.3 },
      ],
    },
  ],
};

/** Long release matching orb contraction. The decay is the cue. */
export function breathExhalePattern(durationSeconds: number): HapticPatternData {
  return {
    events: [
      {
        eventType: 'hapticContinuous',
        time: 0.0,
        eventDuration: durationSeconds,
        parameters: [
          { parameterID: 'hapticIntensity', value: 0.55 },
          { parameterID: 'hapticSharpness', value: 0.12 },
        ],
      },
    ],
    parameterCurves: [
      {
        parameterID: 'hapticIntensityControl',
        relativeTime: 0.0,
        controlPoints: [
          { relativeTime: 0.0, value: 1.0 },
          { relativeTime: durationSeconds * 0.5, value: 0.5 },
          { relativeTime: durationSeconds, value: 0.0 },
        ],
      },
    ],
  };
}

/** Warm landing for idle-state mount. "I'm here, ready when you are." */
export const homeEntrance: HapticPatternData = {
  events: [
    {
      eventType: 'hapticTransient',
      time: 0.0,
      parameters: [
        { parameterID: 'hapticIntensity', value: 0.4 },
        { parameterID: 'hapticSharpness', value: 0.25 },
      ],
    },
    {
      eventType: 'hapticContinuous',
      time: 0.15,
      eventDuration: 0.4,
      parameters: [
        { parameterID: 'hapticIntensity', value: 0.5 },
        { parameterID: 'hapticSharpness', value: 0.2 },
      ],
    },
  ],
  parameterCurves: [
    {
      parameterID: 'hapticIntensityControl',
      relativeTime: 0.15,
      controlPoints: [
        { relativeTime: 0.0, value: 1.0 },
        { relativeTime: 0.25, value: 0.5 },
        { relativeTime: 0.4, value: 0.0 },
      ],
    },
  ],
};
