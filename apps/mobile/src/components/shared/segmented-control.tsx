import { createContext, use, useCallback, useMemo, useState } from "react";
import {
	type LayoutChangeEvent,
	Pressable,
	type PressableProps,
	View,
	type ViewProps,
} from "react-native";
import Animated, {
	type AnimatedProps,
	useAnimatedStyle,
	useSharedValue,
	type WithTimingConfig,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import type { WithSpringConfig } from "react-native-reanimated/lib/typescript/animation/spring";
import { cn } from "@/src/lib/utils";

type ItemMeasurements = { width: number; height: number; x: number };

type ContextValue = {
	value: string;
	onValueChange: (value: string) => void;
	measurements: Record<string, ItemMeasurements>;
	setMeasurements: (key: string, measurements: ItemMeasurements) => void;
};

const SegmentedControlContext = createContext<ContextValue>({
	measurements: {},
	onValueChange: () => {},
	setMeasurements: () => {},
	value: "",
});

type RootProps = ViewProps & {
	value: string;
	onValueChange: (value: string) => void;
	className?: string;
};

function SegmentedControlRoot({
	value,
	onValueChange,
	className,
	children,
	...props
}: RootProps) {
	const [measurements, setMeasurementsState] = useState<
		Record<string, ItemMeasurements>
	>({});

	const setMeasurements = useCallback((key: string, next: ItemMeasurements) => {
		setMeasurementsState((prev) => ({ ...prev, [key]: next }));
	}, []);

	const contextValue = useMemo(
		() => ({ measurements, onValueChange, setMeasurements, value }),
		[value, onValueChange, measurements, setMeasurements]
	);

	return (
		<SegmentedControlContext value={contextValue}>
			<View className={cn("flex-row", className)} {...props}>
				{children}
			</View>
		</SegmentedControlContext>
	);
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ItemProps = AnimatedProps<PressableProps> & {
	value: string;
	className?: string;
};

function SegmentedControlItem({
	value,
	className,
	onPress,
	...props
}: ItemProps) {
	const {
		onValueChange,
		setMeasurements,
		value: activeValue,
	} = use(SegmentedControlContext);
	const isActive = activeValue === value;

	const handleLayout = useCallback(
		(event: LayoutChangeEvent) => {
			const { width, height, x } = event.nativeEvent.layout;
			setMeasurements(value, { height, width, x });
		},
		[value, setMeasurements]
	);

	const handlePress: PressableProps["onPress"] = useCallback(
		(event) => {
			onValueChange(value);
			// AnimatedProps<PressableProps>["onPress"] also allows a SharedValue,
			// but callers only ever pass a plain function here.
			(onPress as PressableProps["onPress"])?.(event);
		},
		[value, onValueChange, onPress]
	);

	return (
		<AnimatedPressable
			accessibilityRole="radio"
			accessibilityState={{ selected: isActive }}
			className={className}
			onLayout={handleLayout}
			onPress={handlePress}
			{...props}
		/>
	);
}

type IndicatorProps = AnimatedProps<ViewProps> & {
	className?: string;
	animationConfig?:
		| { type: "timing"; config?: WithTimingConfig }
		| { type: "spring"; config?: WithSpringConfig };
};

const DEFAULT_ANIMATION_CONFIG: IndicatorProps["animationConfig"] = {
	type: "spring",
};

function SegmentedControlIndicator({
	className,
	style,
	animationConfig = DEFAULT_ANIMATION_CONFIG,
	...props
}: IndicatorProps) {
	const { value, measurements } = use(SegmentedControlContext);
	const activeMeasurements = measurements[value];
	const hasMeasured = useSharedValue(false);
	const reanimatedConfig = animationConfig?.config;

	const animatedStyle = useAnimatedStyle(() => {
		if (!activeMeasurements) {
			return { height: 0, left: 0, opacity: 0, width: 0 };
		}

		if (!hasMeasured.value) {
			hasMeasured.set(true);
			return {
				height: activeMeasurements.height,
				left: activeMeasurements.x,
				opacity: 1,
				width: activeMeasurements.width,
			};
		}

		return {
			height:
				animationConfig?.type === "timing"
					? withTiming(
							activeMeasurements.height,
							reanimatedConfig as WithTimingConfig
						)
					: withSpring(
							activeMeasurements.height,
							reanimatedConfig as WithSpringConfig
						),
			left:
				animationConfig?.type === "timing"
					? withTiming(
							activeMeasurements.x,
							reanimatedConfig as WithTimingConfig
						)
					: withSpring(
							activeMeasurements.x,
							reanimatedConfig as WithSpringConfig
						),
			opacity: 1,
			width:
				animationConfig?.type === "timing"
					? withTiming(
							activeMeasurements.width,
							reanimatedConfig as WithTimingConfig
						)
					: withSpring(
							activeMeasurements.width,
							reanimatedConfig as WithSpringConfig
						),
		};
	});

	return (
		<Animated.View
			className={cn("absolute", className)}
			style={[animatedStyle, style]}
			{...props}
		/>
	);
}

SegmentedControlRoot.displayName = "SegmentedControl";
SegmentedControlItem.displayName = "SegmentedControl.Item";
SegmentedControlIndicator.displayName = "SegmentedControl.Indicator";

export const SegmentedControl = Object.assign(SegmentedControlRoot, {
	Indicator: SegmentedControlIndicator,
	Item: SegmentedControlItem,
});
