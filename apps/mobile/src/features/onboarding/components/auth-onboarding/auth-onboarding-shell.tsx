/**
 * The screen's frame, laid out the way superlist does it: the sign-in block
 * and the morphing pill sit in the bottom stack, and the carousel is
 * absolutely positioned ON TOP of them, sliding up out of the way as the
 * sheet opens.
 */
import { useWindowDimensions, View } from "react-native";
import { FlatList, GestureDetector } from "react-native-gesture-handler";
import Animated, {
	Extrapolation,
	interpolate,
	useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScopedTheme } from "uniwind";

import { useAppTheme } from "@/src/context/app-theme-context";
import type { StoryBeat } from "@/src/features/onboarding/story-beats";
import { AuthSheetBlock, MorphingSeatButton } from "./auth-sheet";
import { HearthBackdrop } from "./hearth-backdrop";
import { StoryBeatSlide } from "./story-beat";
import { StoryPagination } from "./story-pagination";
import { LOOPED_BEATS, useStoryCarousel } from "./use-story-carousel";

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<StoryBeat>);
/** How far the deck lifts to make room for the sign-in block. */
const LIFT = 250;

export const AuthOnboardingShell = () => {
	const insets = useSafeAreaInsets();
	const { height: screenHeight } = useWindowDimensions();
	// The deck itself is pinned dark, but the app the user lands in after
	// sign-in is not: a light-theme user gets the full sunrise so the hand-off
	// is seamless, a dark-theme one stops at a pre-dawn glow for the same
	// reason in the other direction.
	const { isDark } = useAppTheme();
	// Destructured rather than kept as one object: the hook's animated list ref
	// rides along in that object, and every read off it then looks like a ref
	// access during render to the compiler's ref pass.
	const {
		listRef,
		width,
		currentIndex,
		scrollX,
		animatedIndex,
		isDragging,
		progress,
		scrollHandler,
		scrollToIndex,
		expand,
		collapse,
		gesture,
	} = useStoryCarousel();

	const rDeckStyle = useAnimatedStyle(() => ({
		transform: [
			{
				translateY: interpolate(
					progress.get(),
					[0, 1],
					[0, -LIFT],
					Extrapolation.CLAMP
				),
			},
		],
	}));

	const rPaginationStyle = useAnimatedStyle(() => ({
		opacity: interpolate(
			progress.get(),
			[0, 0.25],
			[1, 0],
			Extrapolation.CLAMP
		),
		pointerEvents: progress.get() === 0 ? "auto" : "none",
	}));

	const rScrimStyle = useAnimatedStyle(() => ({
		opacity: interpolate(
			progress.get(),
			[0, 1],
			[0, 0.72],
			Extrapolation.CLAMP
		),
	}));

	return (
		<ScopedTheme theme="dark">
			<View
				className="flex-1 bg-background"
				style={{ paddingBottom: insets.bottom + 12 }}
			>
				<HearthBackdrop
					dawnCeiling={isDark ? 0.4 : 1}
					scrollX={scrollX}
					width={width}
				/>

				{/* Bottom stack — revealed as the deck lifts off it. */}
				<View className="mt-auto">
					<AuthSheetBlock onCollapse={collapse} progress={progress} />
					<MorphingSeatButton
						onCollapse={collapse}
						onExpand={expand}
						progress={progress}
					/>
				</View>

				<GestureDetector gesture={gesture}>
					<Animated.View
						className="absolute w-full"
						style={[
							{
								height: screenHeight - insets.top - insets.bottom - 80,
								top: insets.top,
							},
							rDeckStyle,
						]}
					>
						<AnimatedFlatList
							data={LOOPED_BEATS}
							getItemLayout={(_, index) => ({
								index,
								length: width,
								offset: width * index,
							})}
							horizontal
							initialScrollIndex={0}
							keyExtractor={(item) => item.id}
							onScroll={scrollHandler}
							pagingEnabled
							// gesture-handler's FlatList doesn't line up with Reanimated's
							// animated-ref type, but it is the scrollable `scrollTo` drives.
							ref={listRef as never}
							renderItem={({ item, index }) => (
								<StoryBeatSlide
									beat={item}
									index={index}
									scrollX={scrollX}
									width={width}
								/>
							)}
							scrollEventThrottle={1}
							showsHorizontalScrollIndicator={false}
						/>

						<Animated.View className="pt-5" style={rPaginationStyle}>
							<StoryPagination
								animatedIndex={animatedIndex}
								currentIndex={currentIndex}
								isDragging={isDragging}
								onAdvance={scrollToIndex}
								onFinish={expand}
							/>
						</Animated.View>

						{/* Darkens the tale itself as the sheet takes over. Lives inside the
                deck so it can never dim the sign-in block behind it. */}
						<Animated.View
							className="absolute inset-0 bg-background"
							pointerEvents="none"
							style={rScrimStyle}
						/>
					</Animated.View>
				</GestureDetector>
			</View>
		</ScopedTheme>
	);
};
