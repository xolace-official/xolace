import { useThemeColor } from "heroui-native";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
	useAnimatedReaction,
	useAnimatedScrollHandler,
	useDerivedValue,
	useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { tap } from "@/lib/haptics";
import { AnimatedCarouselCard } from "./animated-carousel-card";
import { CarouselPaginator } from "./carousel-paginator";

const STACK_OFFSET = 8;
const PAGINATOR_VISIBLE_DOTS = 3;
const PAGINATOR_DOT_SIZE = 10;
const PAGINATOR_SPACING = 10;

type StackedCarouselProps<T> = {
	data: T[];
	renderCard: (item: T, index: number) => React.ReactNode;
	/** Fires on a tap-release (not a drag) over card `index`. */
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
	const cardBackground = useThemeColor("surface");
	const shadowColor = useThemeColor("foreground") + "0D";
	const dotColor = useThemeColor("foreground") + "56";

	// Every child is absolute, so the container needs an explicit height: the
	// resting card plus the paginator row. Overflow is clipped, so the scale-1.15
	// swipe peak crops instead of needing headroom.
	const carouselHeight = cardHeight + 40;

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
				scheduleOnRN(tap);
			}
		}
	);

	return (
		<View style={[styles.container, { height: carouselHeight }]}>
			{data.map((item, index) => (
				<AnimatedCarouselCard
					cardBackground={cardBackground}
					cardHeight={cardHeight}
					cardWidth={cardWidth}
					index={index}
					// eslint-disable-next-line react/no-array-index-key -- generic T carries no id; card position is the identity
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
				contentContainerStyle={{
					// Without a matching paddingRight the last card cannot scroll to center.
					paddingLeft: (screenWidth - cardWidth) / 2,
					paddingRight: (screenWidth - cardWidth) / 2,
					paddingTop: STACK_OFFSET * 3,
				}}
				data={data}
				decelerationRate="fast"
				disableIntervalMomentum
				horizontal
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
				style={[
					styles.scrollDriver,
					{ height: cardHeight + STACK_OFFSET * 6, width: screenWidth },
				]}
			/>

			<View
				style={[styles.paginatorWrap, { top: cardHeight, width: screenWidth }]}
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

const styles = StyleSheet.create({
	container: {
		alignItems: "center",
		// flex-start, not center: the absolute cards take their static position
		// from this, and centering pulled the card down over the paginator dots.
		justifyContent: "flex-start",
		overflow: "hidden",
	},
	paginatorWrap: {
		bottom: 0,
		position: "absolute",
	},
	scrollDriver: {
		position: "absolute",
		zIndex: 1000,
	},
});
