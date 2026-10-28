/**
 * A beat — the pause between two stretches of questions.
 *
 * Full-bleed Flux, one line above him, no button. It advances itself after
 * {@link BEAT_MS}; a tap anywhere takes it sooner. Nothing is asked and
 * nothing is stored — the whole job is rhythm, so the flow reads as a
 * character reacting rather than a form paging.
 */

import { Image, type ImageSource } from "expo-image";
import { useEffect, useRef } from "react";
import { Pressable } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { AppText } from "@/components/shared/app-text";
import { IntakeScreen } from "@/features/intake/questionnaire/intake-screen";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

/**
 * Long enough to actually read the line and look at him. 1400 was a flicker —
 * the screen was gone before the eye had finished the headline.
 */
const BEAT_MS = 3400;

interface BeatStepProps {
	/** The one thing it says. "Noted." / "Hey, Camper 4821." */
	line: string;
	mascot: ImageSource;
	onDone: () => void;
	subline?: string;
}

export function BeatStep({ line, subline, mascot, onDone }: BeatStepProps) {
	const reduced = useEffectiveReducedMotion();

	// The timer is set once, on mount, and nothing may restart it. Both the
	// reduced-motion hook and the parent's inline `onDone` change identity on a
	// re-render — and this screen re-renders for free, because that hook is a
	// Convex subscription that lands after first paint. A dependency on either
	// would silently stretch a 1.4s beat into 2.8s.
	const done = useRef(onDone);
	useEffect(() => {
		done.current = onDone;
	});
	useEffect(() => {
		const timer = setTimeout(() => done.current(), BEAT_MS);
		return () => clearTimeout(timer);
	}, []);

	return (
		<IntakeScreen>
			<Pressable
				accessibilityLabel={subline ? `${line}. ${subline}` : line}
				accessibilityRole="button"
				className="flex-1"
				onPress={onDone}
			>
				<Animated.View
					className="gap-2 px-8 pt-12"
					// No translate at all: any vertical travel on a headline moves the
					// line under the eye that is trying to read it. It just appears.
					entering={reduced ? FadeIn.duration(160) : FadeIn.duration(280)}
				>
					<AppText className="text-center font-[Poppins-SemiBold] text-[34px] text-accent leading-1">
						{line}
					</AppText>
					{subline ? (
						<AppText className="text-center font-[Poppins-Regular] text-[15px] text-foreground/55 leading-5">
							{subline}
						</AppText>
					) : null}
				</Animated.View>

				{/* Fills what the line leaves rather than a fixed fraction: a two-line
            headline on a small screen shrinks Flux instead of clipping him. */}
				<Animated.View
					className="flex-1 px-6 pt-4 pb-2"
					entering={
						reduced ? FadeIn.duration(160) : FadeIn.duration(260).delay(80)
					}
				>
					<Image
						contentFit="contain"
						source={mascot}
						style={{ flex: 1, width: "100%" }}
						transition={0}
					/>
				</Animated.View>
			</Pressable>
		</IntakeScreen>
	);
}
