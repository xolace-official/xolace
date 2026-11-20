import { Pressable, useWindowDimensions, View } from "react-native";
import { Presets } from "react-native-pulsar";
import Animated, {
	useAnimatedReaction,
	useAnimatedScrollHandler,
	useDerivedValue,
	useSharedValue,
} from "react-native-reanimated";
import { useTokenColors } from "@/lib/use-token-color";
import { AnimatedCarouselCard } from "./animated-carousel-card";
import { CarouselPaginator } from "./carousel-paginator";

export const carouselHeightFor = (cardHeight: number) => cardHeight + 40;

const STACK_OFFSET = 8;
const PAGINATOR_VISIBLE_DOTS = 3;
const PAGINATOR_DOT_SIZE = 10;
const PAGINATOR_SPACING = 10;

type StackedCarouselProps<T> = {
	data: T[];
	renderCard: (item: T, index: number) => React.ReactNode;
	onCardPress?: (item: T, index: number) => void;
	cardWidth?: number;
	cardHeight?: number;
};

export const StackedCarousel = <T,>({
	data,
	renderCard,
	onCardPress,
	cardWidth = 280,
	cardHeight = 180,
}: StackedCarouselProps<T>) => {
	const { width: screenWidth } = useWindowDimensions();
	const [cardBackground, dotColor, hairline, shadowColor] = useTokenColors([
		"surface",
		"foreground",
		"separator",
		"today-moment-shadow",
	]);

	const carouselHeight = carouselHeightFor(cardHeight);

	const scrollX = useSharedValue(0);

	const scrollHandler = useAnimatedScrollHandler({
		onScroll: (event) => {
			scrollX.set(event.contentOffset.x);
		},
	});

	const currentPageIndex = useDerivedValue(() => scrollX.get() / cardWidth);

	useAnimatedReaction(
		() => Math.round(currentPageIndex.get()),
		(curr, prev) => {
			if (curr !== prev && prev !== null) {
				Presets.System.selection();
			}
		}
	);

	return (
		<View
			className="items-center justify-start overflow-hidden"
			style={{ height: carouselHeight }}
		>
			{data.map((item, index) => (
				<AnimatedCarouselCard
					cardBackground={cardBackground}
					cardHeight={cardHeight}
					cardWidth={cardWidth}
					hairline={hairline}
					index={index}
					key={index}
					scrollX={scrollX}
					shadowColor={shadowColor}
					totalCards={data.length}
				>
					{renderCard(item, index)}
				</AnimatedCarouselCard>
			))}

			{/* Invisible list over the cards: the sole touch target, driving both
			 * scroll and onCardPress (the card visuals are pointerEvents:none). */}
			<Animated.FlatList
				accessibilityElementsHidden
				className="absolute z-1000"
				contentContainerStyle={{
					paddingLeft: (screenWidth - cardWidth) / 2,
					paddingRight: (screenWidth - cardWidth) / 2,
					paddingTop: STACK_OFFSET * 3,
				}}
				data={data}
				decelerationRate="fast"
				disableIntervalMomentum
				horizontal
				importantForAccessibility="no-hide-descendants"
				onScroll={scrollHandler}
				renderItem={({ item, index }) => (
					<Pressable
						onPress={onCardPress ? () => onCardPress(item, index) : undefined}
						style={{ height: cardHeight, width: cardWidth }}
					/>
				)}
				scrollEventThrottle={16}
				showsHorizontalScrollIndicator={false}
				snapToInterval={cardWidth}
				style={{ height: cardHeight + STACK_OFFSET * 6, width: screenWidth }}
			/>

			<View
				className="absolute bottom-0"
				style={{ top: cardHeight, width: screenWidth }}
			>
				<CarouselPaginator
					currentPageIndex={currentPageIndex}
					dotColor={dotColor}
					dotSize={PAGINATOR_DOT_SIZE}
					pagesAmount={data.length}
					spacing={PAGINATOR_SPACING}
					visibleDots={PAGINATOR_VISIBLE_DOTS}
				/>
			</View>
		</View>
	);
};
