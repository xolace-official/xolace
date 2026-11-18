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
import { PLAY_AS_CHOSEN, REDUCED_FADE_MS } from "@/design/springs";
import { playSoftPress } from "@/lib/haptics";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { PROFILE } from "./copy";

const EASE = Easing.out(Easing.quad);
const TIMING = { duration: 250, easing: EASE, ...PLAY_AS_CHOSEN };
const FADE = { duration: REDUCED_FADE_MS, ...PLAY_AS_CHOSEN };

/** Lifts the avatar photo to screen centre over a blur; tap, Android back or drag dismisses.
 * The anchor is measured at tap time, since the Modal blocks scrolling while open. With Reduce
 * Motion the photo doesn't travel: it fades in at the centre, and out again. */
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
	const reduced = useEffectiveReducedMotion();
	const timing = reduced ? FADE : TIMING;

	const expanded = width * 0.7;
	const centerX = (width - expanded) / 2;
	const centerY = (height - expanded) / 2;

	const origin = useSharedValue({ size: 0, x: 0, y: 0 });
	const x = useSharedValue(0);
	const y = useSharedValue(0);
	const size = useSharedValue(0);
	const scale = useSharedValue(1);
	const opacity = useSharedValue(1);
	const blur = useSharedValue(0);
	const panStart = useSharedValue({ x: 0, y: 0 });

	const recenter = () => {
		"worklet";
		blur.set(withTiming(isDark ? 75 : 55, timing));
		opacity.set(withTiming(1, timing));
		size.set(withTiming(expanded, timing));
		x.set(withTiming(centerX, timing));
		y.set(withTiming(centerY, timing));
	};

	const close = (finished?: boolean) => {
		"worklet";
		if (finished) {
			scheduleOnRN(setOpen, false);
		}
	};

	const collapse = () => {
		"worklet";
		blur.set(withTiming(0, timing));
		scale.set(withTiming(1, timing));
		if (reduced) {
			opacity.set(withTiming(0, timing, close)); // where it is, centred or dragged
			return;
		}
		const o = origin.get();
		size.set(withTiming(o.size, timing));
		x.set(withTiming(o.x, timing));
		y.set(withTiming(o.y, timing, close));
	};

	const expand = () => {
		anchor.current?.measureInWindow((ox, oy, w) => {
			playSoftPress();
			origin.set({ size: w, x: ox, y: oy });
			scale.set(1);
			opacity.set(reduced ? 0 : 1); // reduced: unseen at the centre, then fades in
			x.set(reduced ? centerX : ox);
			y.set(reduced ? centerY : oy);
			size.set(reduced ? expanded : w);
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
				scale.set(withTiming(1, timing));
				recenter();
			}
		});

	const rImage = useAnimatedStyle(() => ({
		borderRadius: size.get() / 2,
		height: size.get(),
		left: x.get(),
		opacity: opacity.get(),
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
				accessibilityLabel={PROFILE.viewPhoto(name)}
				accessibilityRole="imagebutton"
				// The overlay copy stands in while open: one photo moving, not two.
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
						accessibilityLabel={PROFILE.closePhoto}
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
