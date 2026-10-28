// A beat: the pause between two stretches of questions. Full-bleed Flux, one line,
// no button. Advances itself after BEAT_MS; a tap anywhere takes it sooner.

import { Image, type ImageSource } from "expo-image";
import { useEffect, useRef } from "react";
import { Pressable } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { AppText } from "@/components/shared/app-text";
import { IntakeScreen } from "@/features/intake/questionnaire/intake-screen";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

/** Long enough to read the line and look at him; 1400 was a flicker. */
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

	// The timer is set once on mount and nothing may restart it: the reduced-motion hook
	// (a Convex subscription) and the inline `onDone` change identity on re-render,
	// and a dependency on either would stretch the beat.
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
					// No translate: vertical travel moves the line under the eye reading it.
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

				{/* Fills what the line leaves, so a two-line headline shrinks Flux instead of
				    clipping him. */}
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
