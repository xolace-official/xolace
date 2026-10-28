import {
	type DerivedValue,
	type SharedValue,
	useDerivedValue,
} from "react-native-reanimated";

type UseTrackDistanceParams = {
	containerWidth: SharedValue<number>;
	containerHeight: SharedValue<number>;
	trackAngle: number;
};

/** Distance the overlay travels to traverse the container at an angle: W·|cos α| + H·|sin α|. */
export const useTrackDistance = ({
	containerWidth,
	containerHeight,
	trackAngle,
}: UseTrackDistanceParams): DerivedValue<number> => {
	const trackDistance = useDerivedValue(() => {
		const containerW = containerWidth.get();
		const containerH = containerHeight.get();

		if (containerW <= 0 || containerH <= 0) {
			return 0;
		}

		const angleRad = (trackAngle * Math.PI) / 180;
		return (
			containerW * Math.abs(Math.cos(angleRad)) +
			containerH * Math.abs(Math.sin(angleRad))
		);
	});

	return trackDistance;
};
