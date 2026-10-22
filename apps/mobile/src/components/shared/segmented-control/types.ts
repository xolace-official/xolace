import type { PressableProps, ViewProps } from "react-native";
import type {
	AnimatedProps,
	WithSpringConfig,
	WithTimingConfig,
} from "react-native-reanimated";

export interface ItemMeasurements {
	height: number;
	width: number;
	x: number;
}

export interface SegmentedControlContextValue {
	measurements: Record<string, ItemMeasurements>;
	onValueChange: (value: string) => void;
	setMeasurements: (key: string, measurements: ItemMeasurements) => void;
	value: string;
}

export interface SegmentedControlProps extends ViewProps {
	className?: string;
	onValueChange: (value: string) => void;
	value: string;
}

export interface SegmentedControlItemProps
	extends AnimatedProps<PressableProps> {
	className?: string;
	value: string;
}

export interface SegmentedControlIndicatorProps
	extends AnimatedProps<ViewProps> {
	animationConfig?:
		| { type: "timing"; config?: WithTimingConfig }
		| { type: "spring"; config?: WithSpringConfig };
	className?: string;
}
