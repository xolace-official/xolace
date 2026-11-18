import { View } from "react-native";
import Animated, {
	Extrapolation,
	interpolate,
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";

type Props = {
	index: number;
	scrollX: SharedValue<number>;
	cardWidth: number;
	cardHeight: number;
	totalCards: number;
	cardBackground: string;
	shadowColor: string;
	/** The board adds a 1 pt hairline to production's 5 pt shadow. */
	hairline: string;
	children: React.ReactNode;
};

export function AnimatedCarouselCard({
	index,
	scrollX,
	cardWidth,
	cardHeight,
	totalCards,
	cardBackground,
	shadowColor,
	hairline,
	children,
}: Props) {
	const extendedInputRange = [
		(index - 2) * cardWidth,
		(index - 1) * cardWidth,
		index * cardWidth,
		(index + 1) * cardWidth,
		(index + 2) * cardWidth,
	];

	const animatedStyle = useAnimatedStyle(() => {
		// Softened: the exiting card must not grow past the card above or fly into the section
		// title.
		const scale = interpolate(
			scrollX.get(),
			extendedInputRange,
			[0.85, 0.92, 1, 1.15, 1.15],
			Extrapolation.CLAMP
		);

		const translateY = interpolate(
			scrollX.get(),
			extendedInputRange,
			[40, 20, 0, -50, -50],
			Extrapolation.CLAMP
		);

		const opacity = interpolate(
			scrollX.get(),
			extendedInputRange,
			[0.2, 0.8, 1, 0, 0],
			Extrapolation.CLAMP
		);

		return {
			opacity,
			transform: [{ translateY }, { scale }],
		};
	});

	const rRotateStyle = useAnimatedStyle(() => {
		const rotateX = interpolate(
			scrollX.get(),
			extendedInputRange,
			[25, 12, 0, 0, 0],
			Extrapolation.CLAMP
		);

		return {
			transform: [
				{ perspective: 600 },
				{ rotateX: `${Math.floor(rotateX)}deg` },
			],
		};
	});

	return (
		<Animated.View
			className="absolute"
			collapsable={false}
			pointerEvents="none"
			style={[
				{
					height: cardHeight,
					width: cardWidth,
					zIndex: totalCards * 1000 - index,
				},
				animatedStyle,
			]}
		>
			<Animated.View className="flex-1" style={rRotateStyle}>
				<View
					className="flex-1 overflow-hidden rounded-[25px] border-continuous"
					collapsable={false}
					style={{
						backgroundColor: cardBackground,
						boxShadow: `0 0 5px 0 ${shadowColor}, 0 0 0 1px ${hairline}`,
					}}
				>
					{children}
				</View>
			</Animated.View>
		</Animated.View>
	);
}
