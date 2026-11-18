import { Image } from "expo-image";
import { type ReactNode, useRef, useState } from "react";
import type { ViewInstance } from "react-native";
import {
	Modal,
	Pressable,
	StyleSheet,
	useWindowDimensions,
} from "react-native";
import {
	Gesture,
	GestureDetector,
	GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
	Easing,
	interpolate,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { AnimatedBlurView } from "@/components/animated-blur-view";
import { useAppTheme } from "@/context/app-theme-context";
import { playSoftPress } from "@/lib/haptics";

const TIMING = { duration: 250, easing: Easing.out(Easing.quad) };

/** Lifts the avatar photo to screen centre over a blur; tap, Android back or drag dismisses.
 * The anchor is measured at tap time, since the Modal blocks scrolling while open. */
export function ExpandableAvatar({
	photoUrl,
	name,
	children,
}: {
	photoUrl?: string;
	name: string;
	children: ReactNode;
}) {
	const anchor = useRef<ViewInstance>(null);
	const [open, setOpen] = useState(false);
	const { width, height } = useWindowDimensions();
	const { isDark } = useAppTheme();

	const expanded = width * 0.7;
	const centerX = (width - expanded) / 2;
	const centerY = (height - expanded) / 2;

	const origin = useSharedValue({ size: 0, x: 0, y: 0 });
	const x = useSharedValue(0);
	const y = useSharedValue(0);
	const size = useSharedValue(0);
	const scale = useSharedValue(1);
	const blur = useSharedValue(0);
	const panStart = useSharedValue({ x: 0, y: 0 });

	const recenter = () => {
		"worklet";
		blur.set(withTiming(isDark ? 75 : 55, TIMING));
		size.set(withTiming(expanded, TIMING));
		x.set(withTiming(centerX, TIMING));
		y.set(withTiming(centerY, TIMING));
	};

	const collapse = () => {
		"worklet";
		const o = origin.get();
		blur.set(withTiming(0, TIMING));
		scale.set(withTiming(1, TIMING));
		size.set(withTiming(o.size, TIMING));
		x.set(withTiming(o.x, TIMING));
		y.set(
			withTiming(o.y, TIMING, (finished) => {
				if (finished) {
					scheduleOnRN(setOpen, false);
				}
			})
		);
	};

	const expand = () => {
		anchor.current?.measureInWindow((ox, oy, w) => {
			playSoftPress();
			origin.set({ size: w, x: ox, y: oy });
			x.set(ox);
			y.set(oy);
			size.set(w);
			setOpen(true);
		});
	};

	// Drag to dismiss: half-speed follow for weight, shrinking and un-blurring
	// as it goes so the release point is legible before the finger lifts.
	const pan = Gesture.Pan()
		.onStart(() => {
			panStart.set({ x: x.get(), y: y.get() });
		})
		.onChange((e) => {
			x.set(x.get() + e.changeX / 2);
			y.set(y.get() + e.changeY / 2);
			const d = Math.hypot(
				x.get() - panStart.get().x,
				y.get() - panStart.get().y
			);
			scale.set(interpolate(d, [0, width / 2], [1, 0.9], "clamp"));
			blur.set(interpolate(d, [0, width / 2], [isDark ? 75 : 55, 0], "clamp"));
		})
		.onEnd(() => {
			const d = Math.hypot(
				x.get() - panStart.get().x,
				y.get() - panStart.get().y
			);
			if (d > expanded / 4) {
				collapse();
			} else {
				scale.set(withTiming(1, TIMING));
				recenter();
			}
		});

	const rImage = useAnimatedStyle(() => ({
		borderRadius: size.get() / 2,
		height: size.get(),
		left: x.get(),
		top: y.get(),
		transform: [{ scale: scale.get() }],
		width: size.get(),
	}));

	if (!photoUrl) {
		return children;
	}

	return (
		<>
			<Pressable
				accessibilityLabel={`View ${name}'s photo`}
				accessibilityRole="imagebutton"
				// The overlay copy stands in for it while open, so it looks like one
				// photo moving rather than two.
				className={open ? "opacity-0" : undefined}
				onPress={expand}
				ref={anchor}
			>
				{children}
			</Pressable>

			<Modal
				animationType="none"
				navigationBarTranslucent
				onRequestClose={collapse}
				onShow={recenter}
				statusBarTranslucent
				transparent
				visible={open}
			>
				<GestureHandlerRootView style={StyleSheet.absoluteFill}>
					<Pressable
						accessibilityLabel="Close photo"
						accessibilityRole="button"
						onPress={collapse}
						style={StyleSheet.absoluteFill}
					>
						<AnimatedBlurView
							blurIntensity={blur}
							style={StyleSheet.absoluteFill}
							tint={isDark ? "dark" : "systemUltraThinMaterialDark"}
						/>
					</Pressable>
					<GestureDetector gesture={pan}>
						<Animated.View className="absolute overflow-hidden" style={rImage}>
							<Image
								contentFit="cover"
								source={{ uri: photoUrl }}
								style={StyleSheet.absoluteFill}
							/>
						</Animated.View>
					</GestureDetector>
				</GestureHandlerRootView>
			</Modal>
		</>
	);
}
