import { useEffect, useState } from "react";
import { AccessibilityInfo, Platform } from "react-native";

export const useAccessibilityInfo = () => {
	const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
	const [reduceTransparencyEnabled, setReduceTransparencyEnabled] =
		useState(false);
	const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);

	useEffect(() => {
		if (Platform.OS === "web") {
			return;
		}
		const reduceMotionChangedSubscription = AccessibilityInfo.addEventListener(
			"reduceMotionChanged",
			(isReduceMotionEnabled) => {
				setReduceMotionEnabled(isReduceMotionEnabled);
			}
		);
		const reduceTransparencyChangedSubscription =
			AccessibilityInfo.addEventListener(
				"reduceTransparencyChanged",
				(isReduceTransparencyEnabled) => {
					setReduceTransparencyEnabled(isReduceTransparencyEnabled);
				}
			);

		const screenReaderChangedSubscription = AccessibilityInfo.addEventListener(
			"screenReaderChanged",
			setScreenReaderEnabled
		);
		AccessibilityInfo.isScreenReaderEnabled().then(setScreenReaderEnabled);

		AccessibilityInfo.isReduceMotionEnabled().then((isReduceMotionEnabled) => {
			setReduceMotionEnabled(isReduceMotionEnabled);
		});
		AccessibilityInfo.isReduceTransparencyEnabled().then(
			(isReduceTransparencyEnabled) => {
				setReduceTransparencyEnabled(isReduceTransparencyEnabled);
			}
		);

		return () => {
			reduceMotionChangedSubscription.remove();
			reduceTransparencyChangedSubscription.remove();
			screenReaderChangedSubscription.remove();
		};
	}, []);

	return {
		reduceMotionEnabled,
		reduceTransparencyEnabled,
		screenReaderEnabled,
	};
};
