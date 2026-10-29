/**
 * Full-screen reveal: spring to centre, flip, blast, collapse on tap. Transform-only at FULL_SIZE.
 */
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";

import Animated, {
	FadeIn,
	FadeOut,
	interpolate,
	type MeasuredDimensions,
	useAnimatedReaction,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { AppText } from "@/components/shared/app-text";
import { getStreakCopy } from "@/features/streak/streak-copy";
import { playSessionComplete } from "@/lib/haptics";
import { BlastParticles, type BlastParticlesRef } from "./blast-particles";
import {
	BLAST_SPRING,
	type CardColors,
	FLIP_SPRING,
	FULL_SIZE,
	getCardMetrics,
	MORPH_SPRING,
} from "./constants";
import { StreakFlipCard } from "./streak-flip-card";

const FULL_METRICS = getCardMetrics(FULL_SIZE);
const BLAST_CANVAS_SIZE = FULL_SIZE * 2.4;

type Props = {
	day: number;
	miniLayout: MeasuredDimensions;
	colors: CardColors;
	/** Called after the collapse spring completes. */
	onDismissed: () => void;
};

export const RevealOverlay = ({
	day,
	miniLayout,
	colors,
	onDismissed,
}: Props) => {
	const { width: windowWidth, height: windowHeight } = useWindowDimensions();

	const morphProgress = useSharedValue(0);
	const flipProgress = useSharedValue(0);
	const blastRef = useRef<BlastParticlesRef>(null);

	const [canDismiss, setCanDismiss] = useState(false);
	const [showMessage, setShowMessage] = useState(false);
	// The Skia canvas is expensive to mount, so it waits for the morph to
	// complete rather than steal frames from the expand spring.
	const [blastReady, setBlastReady] = useState(false);

	const message = getStreakCopy(day);
	const previousDay = Math.max(day - 1, 0);

	// Slightly above centre so the message has room below.
	const targetX = (windowWidth - FULL_SIZE) / 2;
	const targetY = windowHeight * 0.5 - FULL_SIZE * 0.65;

	const startScale = miniLayout.width / FULL_SIZE;
	const deltaX =
		miniLayout.pageX + miniLayout.width / 2 - (targetX + FULL_SIZE / 2);
	const deltaY =
		miniLayout.pageY + miniLayout.height / 2 - (targetY + FULL_SIZE / 2);

	// Expand, then flip, chained on the UI thread. The double rAF pushes the
	// spring past the overlay's first paint; starting on the mount frame drops frames.
	useEffect(() => {
		const onFlipDone = () => {
			setShowMessage(true);
			setCanDismiss(true);
		};
		let rafId = requestAnimationFrame(() => {
			rafId = requestAnimationFrame(() => {
				morphProgress.set(
					withSpring(1, MORPH_SPRING, (morphDone) => {
						"worklet";
						if (!morphDone) {
							return;
						}
						scheduleOnRN(setBlastReady, true);
						flipProgress.set(
							withSpring(1, FLIP_SPRING, (flipDone) => {
								"worklet";
								if (flipDone) {
									scheduleOnRN(onFlipDone);
								}
							})
						);
					})
				);
			});
		});
		return () => cancelAnimationFrame(rafId);
	}, [morphProgress, flipProgress, setBlastReady]);

	const handleApex = () => {
		blastRef.current?.blast(BLAST_SPRING);
		playSessionComplete();
	};

	useAnimatedReaction(
		() => flipProgress.get(),
		(current, previous) => {
			if (previous !== null && previous < 0.5 && current >= 0.5) {
				scheduleOnRN(handleApex);
			}
		}
	);

	const handleDismiss = () => {
		if (!canDismiss) {
			return;
		}
		setCanDismiss(false);
		setShowMessage(false);
		morphProgress.set(
			withSpring(0, MORPH_SPRING, (collapsed) => {
				"worklet";
				if (collapsed) {
					scheduleOnRN(onDismissed);
				}
			})
		);
	};

	const rBackdropStyle = useAnimatedStyle(() => ({
		opacity: morphProgress.get(),
	}));

	const rCardStyle = useAnimatedStyle(() => {
		const progress = morphProgress.get();
		return {
			transform: [
				{ translateX: interpolate(progress, [0, 1], [deltaX, 0]) },
				{ translateY: interpolate(progress, [0, 1], [deltaY, 0]) },
				{ scale: interpolate(progress, [0, 1], [startScale, 1]) },
			],
		};
	});

	return (
		<Pressable
			accessibilityLabel={`Day ${day} streak. Tap to continue`}
			onPress={handleDismiss}
			style={StyleSheet.absoluteFill}
		>
			<Animated.View
				className="absolute inset-0 bg-black/50"
				style={rBackdropStyle}
			/>

			{blastReady && (
				<View
					pointerEvents="none"
					style={[
						styles.blastContainer,
						{
							left: targetX + FULL_SIZE / 2 - BLAST_CANVAS_SIZE / 2,
							top: targetY + FULL_SIZE / 2 - BLAST_CANVAS_SIZE / 2,
						},
					]}
				>
					<BlastParticles
						blastRadius={FULL_SIZE * 0.95}
						circleRadius={3}
						color={colors.header}
						count={24}
						ref={blastRef}
						size={BLAST_CANVAS_SIZE}
					/>
				</View>
			)}

			<Animated.View
				style={[rCardStyle, styles.card, { left: targetX, top: targetY }]}
			>
				<StreakFlipCard
					colors={colors}
					day={day}
					flipProgress={flipProgress}
					metrics={FULL_METRICS}
					previousDay={previousDay}
				/>
			</Animated.View>

			{showMessage && message && (
				<Animated.View
					entering={FadeIn.duration(350)}
					exiting={FadeOut.duration(150)}
					style={[styles.message, { top: targetY + FULL_SIZE + 28 }]}
				>
					<AppText className="text-center text-base text-white/90">
						{message}
					</AppText>
				</Animated.View>
			)}
		</Pressable>
	);
};

const styles = StyleSheet.create({
	blastContainer: {
		height: BLAST_CANVAS_SIZE,
		position: "absolute",
		width: BLAST_CANVAS_SIZE,
	},
	card: {
		position: "absolute",
	},
	message: {
		left: 32,
		position: "absolute",
		right: 32,
	},
});
