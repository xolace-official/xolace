import { Platform } from "react-native";

/** expo-router's `Link.AppleZoom` is native only from iOS 18 (`LinkZoomTransition.swift`). */
const ZOOM_MIN_IOS = 18;

export function zoomSupported(os: string, version: string | number): boolean {
	if (os !== "ios") {
		return false;
	}
	const major = Number.parseInt(String(version), 10);
	return Number.isFinite(major) && major >= ZOOM_MIN_IOS;
}

export function canAppleZoom(): boolean {
	return zoomSupported(Platform.OS, Platform.Version);
}
