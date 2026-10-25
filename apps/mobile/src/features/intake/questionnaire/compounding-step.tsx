/**
 * The one screen in intake that says what Xolace is *for*.
 *
 * Not a beat: there is something to read, so it waits for a press. The pile is
 * the render's job, not the layout's — Flux is already steadying a stack that
 * has gone one slab past comfortable, so a second stack drawn in cards would
 * only say the same thing twice and shrink him doing it.
 */

import { Image } from "expo-image";
import { Button } from "heroui-native";
import { ScrollView } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { AppText } from "@/src/components/shared/app-text";
import { IntakeScreen } from "@/src/features/intake/questionnaire/intake-screen";
import { MASCOT_COMPOUND } from "@/src/features/intake/questionnaire/mascot";
import { playSoftPress } from "@/src/lib/haptics";
import { useEffectiveReducedMotion } from "@/src/lib/motion/use-effective-reduced-motion";

export function CompoundingStep({ onDone }: { onDone: () => void }) {
	const reduced = useEffectiveReducedMotion();
	const after = (ms: number) => (reduced ? 0 : ms);

	return (
		<IntakeScreen>
			<ScrollView
				contentContainerClassName="grow px-5 pt-3 pb-4 gap-4"
				showsVerticalScrollIndicator={false}
			>
				<AppText className="font-[Poppins-Medium] text-[11px] text-foreground/40 uppercase tracking-widest">
					Why this exists
				</AppText>

				<Animated.View entering={FadeIn.duration(300)}>
					<AppText className="font-[Poppins-Regular] text-[22px] text-foreground/55 leading-7.5">
						We lose sight of what builds up.
					</AppText>
				</Animated.View>

				{/* He takes everything the copy leaves: biggest thing on the screen on
            a tall device, and simply smaller on a short one. */}
				<Animated.View
					className="min-h-[260px] flex-1"
					entering={FadeIn.duration(360).delay(after(180))}
				>
					<Image
						contentFit="contain"
						source={MASCOT_COMPOUND}
						style={{ flex: 1, width: "100%" }}
						transition={0}
					/>
				</Animated.View>

				<Animated.View
					className="pb-2"
					entering={FadeIn.duration(320).delay(after(420))}
				>
					{/* Foreground, not accent: the button below is already accent, and
              two saturated blocks touching read as one mistake. The payoff wins
              on weight and full opacity instead — the setup line is the muted
              one. */}
					<AppText className="font-[Poppins-SemiBold] text-[23px] text-foreground leading-8">
						Xolace&apos;s whole mission is to never lose sight of what&apos;s
						compounding for you.
					</AppText>
				</Animated.View>

				<Button
					onPress={() => {
						playSoftPress();
						onDone();
					}}
				>
					<Button.Label>Continue</Button.Label>
				</Button>
			</ScrollView>
		</IntakeScreen>
	);
}
