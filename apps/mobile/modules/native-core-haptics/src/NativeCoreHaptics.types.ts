// Type definitions for NativeCoreHaptics module

/**
 * Valid haptic event types supported by Core Haptics
 */
export type HapticEventType =
  | "hapticTransient"
  | "hapticContinuous"
  | "audioContinuous"
  | "audioCustom";

/**
 * Valid haptic event parameter IDs
 */
export type HapticEventParameterID =
  | "hapticIntensity"
  | "hapticSharpness"
  | "attackTime"
  | "decayTime"
  | "releaseTime"
  | "sustained"
  | "audioVolume"
  | "audioPitch"
  | "audioPan"
  | "audioBrightness";

/**
 * Valid dynamic parameter IDs for parameter curves
 */
export type HapticDynamicParameterID =
  | "hapticIntensityControl"
  | "hapticSharpnessControl"
  | "audioVolumeControl"
  | "audioPanControl"
  | "audioBrightnessControl"
  | "audioPitchControl";

/**
 * Parameter for a haptic event
 */
export interface HapticEventParameter {
  parameterID: HapticEventParameterID;
  value: number; // 0.0 to 1.0
}

/**
 * A single haptic event
 */
export interface HapticEvent {
  eventType: HapticEventType;
  time?: number; // Relative time in seconds (default: 0.0)
  eventDuration?: number; // Duration in seconds (optional, for continuous events)
  parameters?: HapticEventParameter[];
}

/**
 * Control point for a parameter curve
 */
export interface HapticParameterCurveControlPoint {
  relativeTime: number; // Time in seconds
  value: number; // 0.0 to 1.0
}

/**
 * Parameter curve for dynamic haptic control
 */
export interface HapticParameterCurve {
  parameterID: HapticDynamicParameterID;
  controlPoints: HapticParameterCurveControlPoint[];
  relativeTime?: number; // Relative time in seconds (default: 0.0)
}

/**
 * Complete haptic pattern data
 */
export interface HapticPatternData {
  events: HapticEvent[];
  parameterCurves?: HapticParameterCurve[];
}

/**
 * Native module interface
 */
export interface NativeCoreHapticsModule {
  /**
   * Play a simple transient haptic impact
   * @param sharpness - Sharpness of the haptic (0.0 to 1.0)
   * @param intensity - Intensity of the haptic (0.0 to 1.0)
   */
  impact(sharpness: number, intensity: number): Promise<void>;

  /**
   * Play a complex haptic pattern
   * @param patternData - The haptic pattern data to play
   */
  playPattern(patternData: HapticPatternData): Promise<void>;
}
