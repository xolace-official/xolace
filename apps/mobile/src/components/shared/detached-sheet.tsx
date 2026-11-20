import { router } from "expo-router";
import { createContext, type ReactNode, use, useEffect } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { sheetBottom, shouldDismiss } from "@/components/shared/sheet-drag";
import { PLAY_AS_CHOSEN, REDUCED_FADE_MS, spring } from "@/design/springs";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

const SCRIM_IN_MS = 260;
const CLOSE_MS = 240;
const DRAG_FROM = 8;

const SheetClose = createContext<() => void>(() => router.back());
export const useSheetClose = () => use(SheetClose);

export function DetachedSheet({
	children,
	onClosed,
}: {
	children: ReactNode;
	onClosed?: () => void;
}) {
	const insets = useSafeAreaInsets();
	const { height } = useWindowDimensions();
	const reduced = useEffectiveReducedMotion();
	const y = useSharedValue(reduced ? 0 : height);
	const shown = useSharedValue(0);

	useEffect(() => {
		shown.set(
			withTiming(1, {
				duration: reduced ? REDUCED_FADE_MS : SCRIM_IN_MS,
				...PLAY_AS_CHOSEN,
			})
		);
		if (!reduced) {
			y.set(spring("settle", 0, false));
		}
	}, [y, shown, reduced]);

	const close = () => {
		onClosed?.();
		router.back();
	};
	const animateOut = () => {
		"worklet";
		const timing = { duration: CLOSE_MS, ...PLAY_AS_CHOSEN };
		const closed = () => {
			scheduleOnRN(close);
		};
		if (reduced) {
			shown.set(withTiming(0, timing, closed));
			return;
		}
		shown.set(withTiming(0, timing));
		y.set(withTiming(height, timing, closed));
	};

	const pan = usePanGesture({
		activeOffsetY: DRAG_FROM,
		onDeactivate: (e) => {
			if (shouldDismiss(e.translationY, e.velocityY)) {
				animateOut();
			} else {
				y.set(spring("settle", 0, reduced));
			}
		},
		onUpdate: (e) => {
			y.set(Math.max(0, e.translationY));
		},
	});

	const sheet = useAnimatedStyle(() => ({
		opacity: reduced ? shown.get() : 1,
		transform: [{ translateY: y.get() }],
	}));
	const dim = useAnimatedStyle(() => ({ opacity: shown.get() }));

	return (
		<View className="flex-1">
			<Animated.View className="absolute inset-0 bg-backdrop" style={dim}>
				<Pressable
					accessibilityLabel="Close"
					className="flex-1"
					onPress={animateOut}
				/>
			</Animated.View>
			<GestureDetector gesture={pan}>
				<Animated.View
					// VoiceOver stays in the sheet, so the scrim's Close is out of reach:
					// the escape gesture (two-finger Z) closes it instead.
					accessibilityViewIsModal
					className="absolute right-2.5 left-2.5 rounded-[42px] border-continuous bg-surface shadow-sheet"
					onAccessibilityEscape={animateOut}
					style={[{ bottom: sheetBottom(insets.bottom) }, sheet]}
				>
					<SheetClose value={animateOut}>{children}</SheetClose>
				</Animated.View>
			</GestureDetector>
		</View>
	);
}
