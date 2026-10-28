import { Accelerometer } from "expo-sensors";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { createShakeDetector } from "./shake-detector";

/** Explicit because platform defaults disagree (Android 100ms, iOS ~100Hz).
 * At 50ms a 4Hz shake aliases and reads ~40% low; 25ms lands near the peaks. */
const SAMPLE_INTERVAL_MS = 25;

type Options = {
	/** When false, no accelerometer subscription. */
	enabled: boolean;
	/** Fired on a qualifying shake. */
	onShake: () => void;
};

/** Subscribes to the accelerometer only while `enabled`. Qualification lives in
 * `createShakeDetector`; the dev-menu fallback is registered once globally. */
export const useShakeToOpen = ({ enabled, onShake }: Options) => {
	const onShakeRef = useRef(onShake);
	useEffect(() => {
		onShakeRef.current = onShake;
	}, [onShake]);

	useEffect(() => {
		if (!enabled || Platform.OS === "web") {
			return;
		}

		let cancelled = false;
		const detect = createShakeDetector();
		let subscription: ReturnType<typeof Accelerometer.addListener> | null =
			null;

		Accelerometer.isAvailableAsync().then((available) => {
			if (!available || cancelled) {
				return;
			}
			Accelerometer.setUpdateInterval(SAMPLE_INTERVAL_MS);
			subscription = Accelerometer.addListener((sample) => {
				if (detect(sample, Date.now())) {
					onShakeRef.current();
				}
			});
		});

		return () => {
			cancelled = true;
			subscription?.remove();
		};
	}, [enabled]);
};
