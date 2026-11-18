import { Platform } from "react-native";

/** expo-router's `Link.AppleZoom` is native only from iOS 18 (`LinkZoomTransition.swift`). */
const ZOOM_MIN_IOS = 18;

/** Pure: whether this OS and version draw the zoom. iOS reports its version as "17.4". */
export function zoomSupported(os: string, version: string | number): boolean {
	if (os !== "ios") {
		return false;
	}
	const major = Number.parseInt(String(version), 10);
	return Number.isFinite(major) && major >= ZOOM_MIN_IOS;
}

/**
 * Whether a zoom source should zoom here. expo-router turns the zoom on for every iOS
 * version, and then turns off the destination's swipe-back to make room for a dismissal
 * that only iOS 18 has; pass `withAppleZoom` and the dismissal bounds through this.
 */
export function canAppleZoom(): boolean {
	return zoomSupported(Platform.OS, Platform.Version);
}
