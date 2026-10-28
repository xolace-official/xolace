// Carousel half of the auth-onboarding screen: beat paging, infinite wrap and the
// sign-in sheet's expand/collapse (`progress`: 0 = tale, 1 = sign-in open). Everything
// that moves the list is a worklet via `useAnimatedRef` + `scrollTo`.
import { useEffect, useState } from "react";
import { AppState, useWindowDimensions } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import type Animated from "react-native-reanimated";
import {
	ReduceMotion,
	scrollTo,
	useAnimatedReaction,
	useAnimatedRef,
	useAnimatedScrollHandler,
	useSharedValue,
	withSpring,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { STORY_BEATS, type StoryBeat } from "@/features/onboarding/story-beats";
import { playSoftPress } from "@/lib/haptics";

const SWIPE_THRESHOLD = 24;
const DRAG_DAMPING = 260;
/** A flick past this commits the sheet regardless of distance covered. */
const FLICK_VELOCITY = 450;
/** One spring for every path into the sheet, so an interruption continues rather than restarts. */
const SHEET_SPRING = {
	dampingRatio: 0.82,
	duration: 340,
	reduceMotion: ReduceMotion.System,
} as const;

/** Beat 0 duplicated at the tail so the wrap has somewhere to land. */
export const LOOPED_BEATS: StoryBeat[] = [
	...STORY_BEATS,
	{ ...STORY_BEATS[0], id: "dusk-loop" },
];

export const useStoryCarousel = () => {
	const { width } = useWindowDimensions();
	const listRef = useAnimatedRef<Animated.FlatList<StoryBeat>>();
	const [currentIndex, setCurrentIndex] = useState(0);

	const scrollX = useSharedValue(0);
	const animatedIndex = useSharedValue(0);
	const isDragging = useSharedValue(false);
	const progress = useSharedValue(0);
	const startProgress = useSharedValue(0);

	// Current beat from the rounded offset, not `onViewableItemsChanged`: fractional slide
	// widths on Android (411.43px on a Pixel 7 Pro) never reach 100% visibility, which
	// stalled the tale.
	useAnimatedReaction(
		() => Math.round(animatedIndex.get()),
		(index, previous) => {
			if (index === previous) {
				return;
			}
			// The tail duplicate sits at index === length; the real beat is 0.
			scheduleOnRN(setCurrentIndex, index >= STORY_BEATS.length ? 0 : index);
		}
	);

	/** Worklet: the one way the deck moves. */
	const scrollToIndex = (index: number) => {
		"worklet";
		scrollTo(listRef, index * width, 0, true);
	};

	const scrollHandler = useAnimatedScrollHandler({
		onBeginDrag: () => isDragging.set(true),
		onEndDrag: () => isDragging.set(false),
		// Once momentum settles on the tail duplicate, jump to the real beat 0. Waiting for
		// momentum (not onEndReached) keeps the jump from fighting an in-flight scroll.
		onMomentumEnd: (e) => {
			if (e.contentOffset.x >= width * STORY_BEATS.length - 1) {
				scrollTo(listRef, 0, 0, false);
			}
		},
		onScroll: (e) => {
			scrollX.set(e.contentOffset.x);
			animatedIndex.set(e.contentOffset.x / width);
		},
	});

	// The beat timer runs on wall-clock time, so a backgrounded app would fast-forward the
	// tale. Background borrows `isDragging` as the hold; it is not cleared while the sheet
	// is open because that hold belongs to the sheet.
	useEffect(() => {
		const sub = AppState.addEventListener("change", (state) => {
			if (state !== "active") {
				isDragging.set(true);
			} else if (progress.get() === 0) {
				isDragging.set(false);
			}
		});
		return () => sub.remove();
	}, [isDragging, progress]);

	const expand = () => {
		isDragging.set(true);
		progress.set(withSpring(1, SHEET_SPRING));
	};
	const collapse = () => {
		isDragging.set(false);
		progress.set(withSpring(0, SHEET_SPRING));
	};

	const panGesture = Gesture.Pan()
		// Vertical only: the same detector wraps the paging list.
		.activeOffsetY([-10, 10])
		.failOffsetX([-10, 10])
		.onBegin(() => {
			startProgress.set(progress.get());
			isDragging.set(true);
		})
		.onUpdate((e) => {
			progress.set(
				Math.min(
					1,
					Math.max(0, startProgress.get() - e.translationY / DRAG_DAMPING)
				)
			);
		})
		.onEnd((e) => {
			const moved = (progress.get() - startProgress.get()) * DRAG_DAMPING;
			const from = startProgress.get() > 0.5 ? 1 : 0;
			const target =
				Math.abs(e.velocityY) > FLICK_VELOCITY
					? e.velocityY < 0
						? 1
						: 0
					: moved > SWIPE_THRESHOLD
						? 1
						: moved < -SWIPE_THRESHOLD
							? 0
							: from;
			// The finger's velocity carries into the spring.
			if (target !== from) {
				scheduleOnRN(playSoftPress);
			}
			progress.set(
				withSpring(
					target,
					{ ...SHEET_SPRING, velocity: -e.velocityY / DRAG_DAMPING },
					(finished) => {
						if (finished && target === 0) {
							isDragging.set(false);
						}
					}
				)
			);
		});

	// Tap advances the tale only while the sheet is closed.
	const tapGesture = Gesture.Tap()
		.maxDuration(250)
		.onStart(() => {
			if (progress.get() > 0) {
				return;
			}
			scrollToIndex(Math.round(animatedIndex.get()) + 1);
			isDragging.set(false);
		});

	return {
		animatedIndex,
		collapse,
		currentIndex,
		expand,
		gesture: Gesture.Race(panGesture, tapGesture),
		isDragging,
		listRef,
		progress,
		scrollHandler,
		scrollToIndex,
		scrollX,
		setCurrentIndex,
		width,
	};
};
