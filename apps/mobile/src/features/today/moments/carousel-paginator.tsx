import { View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import Animated, {
	Easing,
	useAnimatedStyle,
	useDerivedValue,
	withSpring,
	withTiming,
} from "react-native-reanimated";

type CarouselPaginatorProps = {
	pagesAmount: number;
	currentPageIndex: SharedValue<number>;
	visibleDots: number;
	dotSize?: number;
	spacing?: number;
	dotColor: string;
};

const SpringConfig = {
	damping: 15,
	mass: 0.5,
	stiffness: 100,
} as const;

export function CarouselPaginator({
	pagesAmount,
	currentPageIndex,
	visibleDots,
	dotSize = 7,
	spacing = 8,
	dotColor,
}: CarouselPaginatorProps) {
	const dots = new Array(pagesAmount).fill(0);

	const visibleDotsIndices = useDerivedValue(() => {
		const currentIndex = Math.round(currentPageIndex.get());
		const halfVisible = Math.floor(visibleDots / 2);
		let start = Math.max(currentIndex - halfVisible, 0);
		const end = Math.min(start + visibleDots, pagesAmount);

		if (end === pagesAmount) {
			start = Math.max(pagesAmount - visibleDots, 0);
		}

		return { currentIndex, end, start };
	});

	const containerAnimatedStyle = useAnimatedStyle(() => {
		const { currentIndex } = visibleDotsIndices.get();
		const totalWidth = pagesAmount * (dotSize + spacing);
		const centerOffset = totalWidth / 2;
		const currentPosition = currentIndex * (dotSize + spacing) + dotSize / 2;
		const translateX = centerOffset - currentPosition;

		return {
			transform: [{ translateX: withSpring(translateX, SpringConfig) }],
		};
	});

	return (
		<View
			className="absolute inset-x-0 bottom-0 h-5 items-center justify-center overflow-hidden"
			pointerEvents="none"
		>
			<Animated.View
				className="flex-row items-center justify-center"
				style={containerAnimatedStyle}
			>
				{dots.map((_, index) => (
					<AnimatedDot
						dotColor={dotColor}
						dotSize={dotSize}
						index={index}
						key={index}
						spacing={spacing}
						visibleDotsIndices={visibleDotsIndices}
					/>
				))}
			</Animated.View>
		</View>
	);
}

type AnimatedDotProps = {
	index: number;
	visibleDotsIndices: SharedValue<{
		start: number;
		end: number;
		currentIndex: number;
	}>;
	spacing: number;
	dotSize: number;
	dotColor: string;
};

const DOT_ALPHA = 0.34;

function AnimatedDot({
	index,
	visibleDotsIndices,
	spacing,
	dotSize,
	dotColor,
}: AnimatedDotProps) {
	const isVisible = useDerivedValue(
		() =>
			index >= visibleDotsIndices.get().start &&
			index < visibleDotsIndices.get().end
	);

	const visibility = useDerivedValue(() => {
		const isActive = visibleDotsIndices.get().currentIndex === index;
		const opacity = isActive ? 1 : isVisible.get() ? 0.75 : 0;

		return withTiming(opacity, {
			duration: 500,
			easing: Easing.linear,
		});
	});

	const rContainerStyle = useAnimatedStyle(() => {
		const scale = withSpring(
			visibleDotsIndices.get().currentIndex === index ? 1 : 0.75,
			SpringConfig
		);
		return {
			marginRight: spacing,
			opacity: visibility.get(),
			transform: [{ scale }],
		};
	});

	const rDotStyle = useAnimatedStyle(() => ({
		backgroundColor: dotColor,
		height: dotSize,
		width: dotSize,
	}));

	return (
		<Animated.View style={rContainerStyle}>
			<Animated.View
				className="items-start justify-center rounded-full"
				style={[{ opacity: DOT_ALPHA }, rDotStyle]}
			/>
		</Animated.View>
	);
}
