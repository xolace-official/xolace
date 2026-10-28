// Pagination row: the active bar is ~3x wider, fills over the beat's duration, then
// auto-advances. Dragging cancels the fill and restarts it on release; completing
// the last beat expands the auth sheet.
import { useEffect } from "react";
import { useWindowDimensions, View } from "react-native";
import Animated, {
	cancelAnimation,
	Extrapolation,
	interpolate,
	type SharedValue,
	useAnimatedReaction,
	useAnimatedStyle,
	useDerivedValue,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { STORY_BEATS } from "@/features/onboarding/story-beats";

const GAP = 4;

type ItemProps = {
	index: number;
	currentIndex: number;
	animatedIndex: SharedValue<number>;
	inactiveWidth: number;
	activeWidth: number;
	total: number;
	duration: number;
	isDragging: SharedValue<boolean>;
	/** Worklet: moves the deck from the UI thread. */
	onAdvance: (index: number) => void;
	onFinish: () => void;
};

const PaginationItem = ({
	index,
	currentIndex,
	animatedIndex,
	inactiveWidth,
	activeWidth,
	total,
	duration,
	isDragging,
	onAdvance,
	onFinish,
}: ItemProps) => {
	const fill = useSharedValue(0);

	const barWidth = useDerivedValue(() => {
		const i = animatedIndex.get();
		let width = interpolate(
			i,
			[index - 1, index, index + 1],
			[inactiveWidth, activeWidth, inactiveWidth],
			Extrapolation.CLAMP
		);

		// The list duplicates beat 0 at the end, so index `total` is really beat 0.
		if (index === 0) {
			width = Math.max(
				width,
				interpolate(
					i,
					[total - 1, total],
					[inactiveWidth, activeWidth],
					Extrapolation.CLAMP
				)
			);
		}
		if (index === total - 1 && i >= total - 1) {
			width = interpolate(
				i,
				[total - 1, total],
				[activeWidth, inactiveWidth],
				Extrapolation.CLAMP
			);
		}
		return width;
	});

	const rBarStyle = useAnimatedStyle(() => ({ width: barWidth.get() }));

	// Percent width is a layout property, but the fill is absolute and childless.
	const rFillStyle = useAnimatedStyle(() => ({
		opacity: interpolate(
			barWidth.get(),
			[inactiveWidth, activeWidth],
			[0, 1],
			Extrapolation.CLAMP
		),
		width: `${interpolate(fill.get(), [0, 1], [0, 100], Extrapolation.CLAMP)}%`,
	}));

	// The beat ends in the timing callback, not a reaction on `fill >= 1`: a reaction
	// re-registers on every render and runs immediately, which fired a second advance
	// from a bar parked at 1. The callback fires once and `finished` is false when cancelled.
	const startFill = () => {
		"worklet";
		fill.set(0);
		fill.set(
			withTiming(1, { duration }, (finished) => {
				if (!finished) {
					return;
				}
				// Keyed off this bar's own index, which cannot go stale.
				if (index === total - 1) {
					scheduleOnRN(onFinish);
				} else {
					onAdvance(index + 1);
				}
			})
		);
	};

	useEffect(() => {
		fill.set(0);
		if (currentIndex === index) {
			startFill();
		}
		// `startFill` is recreated every render; the effect must run on beat changes only.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentIndex, index, duration, fill]);

	// Cancel on touch, restart on release. Not in the style worklet: a style runs every
	// frame and must not have side effects.
	useAnimatedReaction(
		() => isDragging.get(),
		(dragging, wasDragging) => {
			if (dragging) {
				cancelAnimation(fill);
				return;
			}
			// `wasDragging === true`, not `!dragging`: the reaction re-registers on every render
			// with a null previous. No `fill > 0` guard either: a hold begun the instant a beat
			// starts leaves the fill at 0 and would stall the tale.
			if (wasDragging === true && currentIndex === index) {
				startFill();
			}
		}
	);

	return (
		<Animated.View
			className="h-0.5 overflow-hidden rounded-full bg-foreground/15"
			style={rBarStyle}
		>
			<Animated.View
				className="absolute top-0 bottom-0 left-0 bg-ember"
				style={rFillStyle}
			/>
		</Animated.View>
	);
};

export const StoryPagination = ({
	currentIndex,
	animatedIndex,
	isDragging,
	onAdvance,
	onFinish,
}: {
	currentIndex: number;
	animatedIndex: SharedValue<number>;
	isDragging: SharedValue<boolean>;
	onAdvance: (index: number) => void;
	onFinish: () => void;
}) => {
	const { width } = useWindowDimensions();
	const padding = width * 0.16;
	const total = STORY_BEATS.length;
	// Reserve room for the active bar's 3x expansion so the row never overflows.
	const itemWidth = (width - padding * 2 - (total - 1) * GAP) / (total + 2);

	return (
		<View
			className="flex-row items-center justify-center"
			style={{ gap: GAP, paddingHorizontal: padding }}
		>
			{STORY_BEATS.map((beat, index) => (
				<PaginationItem
					activeWidth={itemWidth * 3}
					animatedIndex={animatedIndex}
					currentIndex={currentIndex}
					duration={beat.duration}
					inactiveWidth={itemWidth}
					index={index}
					isDragging={isDragging}
					key={beat.id}
					onAdvance={onAdvance}
					onFinish={onFinish}
					total={total}
				/>
			))}
		</View>
	);
};
