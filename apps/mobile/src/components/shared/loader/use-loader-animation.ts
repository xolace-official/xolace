import { useEffect } from "react";
import {
	cancelAnimation,
	Easing,
	withDelay,
	withRepeat,
	withSequence,
	withTiming,
} from "react-native-reanimated";
import type { UseLoaderAnimationConfig } from "./types";

/** Drives the loader: builds the repeat/delay sequence and updates the progress SharedValue
 * (0–1). */
export const useLoaderAnimation = (config: UseLoaderAnimationConfig) => {
	const {
		progress,
		duration = 1000,
		initialDelay = 0,
		repeatDelay = 0,
		numberOfReps = -1,
		reverse = false,
		easing = Easing.linear,
		autoPlay = true,
	} = config;

	useEffect(() => {
		if (!autoPlay) {
			return;
		}

		progress.set(0);

		const animateToEnd = withTiming(1, { duration, easing });
		let repeatedAnimation: ReturnType<typeof withRepeat>;

		if (reverse) {
			const animateBack = withTiming(0, { duration, easing });
			const fullCycle =
				repeatDelay > 0
					? withSequence(
							animateToEnd,
							animateBack,
							withDelay(repeatDelay, withTiming(0, { duration: 0 }))
						)
					: withSequence(animateToEnd, animateBack);

			repeatedAnimation = withRepeat(fullCycle, numberOfReps, false);
		} else {
			const animationSequence =
				repeatDelay > 0
					? withSequence(
							animateToEnd,
							withDelay(repeatDelay, withTiming(0, { duration: 0 }))
						)
					: withSequence(animateToEnd, withTiming(0, { duration: 0 }));

			repeatedAnimation = withRepeat(animationSequence, numberOfReps, false);
		}

		progress.set(
			initialDelay > 0
				? withDelay(initialDelay, repeatedAnimation)
				: repeatedAnimation
		);

		return () => {
			cancelAnimation(progress);
		};
	}, [
		autoPlay,
		progress,
		duration,
		initialDelay,
		repeatDelay,
		numberOfReps,
		reverse,
		easing,
	]);
};
