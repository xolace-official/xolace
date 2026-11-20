export type HapticEventType =
	| "hapticTransient"
	| "hapticContinuous"
	| "audioContinuous"
	| "audioCustom";

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

export type HapticDynamicParameterID =
	| "hapticIntensityControl"
	| "hapticSharpnessControl"
	| "audioVolumeControl"
	| "audioPanControl"
	| "audioBrightnessControl"
	| "audioPitchControl";

type Seconds = number;

export interface HapticEventParameter {
	parameterID: HapticEventParameterID;
	value: number;
}

export interface HapticEvent {
	eventDuration?: Seconds;
	eventType: HapticEventType;
	parameters?: HapticEventParameter[];
	time?: Seconds;
}

export interface HapticParameterCurveControlPoint {
	relativeTime: Seconds;
	value: number;
}

export interface HapticParameterCurve {
	controlPoints: HapticParameterCurveControlPoint[];
	parameterID: HapticDynamicParameterID;
	relativeTime?: Seconds;
}

export interface HapticPatternData {
	events: HapticEvent[];
	parameterCurves?: HapticParameterCurve[];
}

export interface NativeCoreHapticsModule {
	/**
	 * Play a simple transient haptic impact
	 * @param sharpness - Sharpness of the haptic (0.0 to 1.0)
	 * @param intensity - Intensity of the haptic (0.0 to 1.0)
	 */
	impact(sharpness: number, intensity: number): Promise<void>;

	playPattern(patternData: HapticPatternData): Promise<void>;
}
