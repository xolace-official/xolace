import { Accelerometer } from "expo-sensors";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { createShakeDetector } from "./shake-detector";

const SAMPLE_INTERVAL_MS = 25;

type Options = {
	enabled: boolean;
	onShake: () => void;
};

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
