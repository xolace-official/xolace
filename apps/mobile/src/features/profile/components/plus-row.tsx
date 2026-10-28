import { Image } from "expo-image";
import { PressableFeedback, useThemeColor } from "heroui-native";
import { View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { AnimatedDashedBorder } from "@/components/shared/animated-dashed-border";
import { AppText } from "@/components/shared/app-text";
import { usePaywall } from "@/features/purchases/use-paywall";
import { playSoftPress } from "@/lib/haptics";

const EASE: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];
const MASCOT = require("@/assets/images/flux/plus-mascot.png");

type Props = {
	staggerDelay?: number;
};

/** A door, not an offer (#221 §5): always here and exempt from every proactive-
 * offer cooldown. Not the shared PlusOfferCard: there is nothing to decline. */
export function PlusRow({ staggerDelay = 500 }: Props) {
	const accentColor = useThemeColor("accent") as string;
	const openPaywall = usePaywall((s) => s.open);

	return (
		<EaseView
			animate={{ opacity: 1, translateY: 0 }}
			className="mx-5 mt-4"
			initialAnimate={{ opacity: 0, translateY: 8 }}
			transition={{
				delay: staggerDelay,
				duration: 280,
				easing: EASE,
				type: "timing",
			}}
		>
			{/* The border lives on the wrapper, so the pressable carries none of its own. */}
			<AnimatedDashedBorder
				animationSpeed={4000}
				borderRadius={24}
				dashLength={7}
				gapLength={6}
				strokeColor={`${accentColor}66`}
				strokeWidth={1.25}
			>
				<PressableFeedback
					accessibilityLabel="Xolace+. The days add up. See what that gets you."
					accessibilityRole="button"
					className="flex-row items-center gap-3 rounded-3xl bg-accent/[0.05] px-5 py-4"
					onPress={() => {
						playSoftPress();
						openPaywall("profile_row");
					}}
				>
					<View className="size-9 items-center justify-center overflow-hidden rounded-xl bg-accent/12">
						<Image
							contentFit="contain"
							source={MASCOT}
							style={{ height: 34, width: 34 }}
						/>
					</View>
					<View className="flex-1">
						<AppText className="font-medium text-[15px] text-foreground">
							Xolace+
						</AppText>
						<AppText className="text-[13px] text-muted leading-5">
							The days add up. See what that gets you.
						</AppText>
					</View>
				</PressableFeedback>
			</AnimatedDashedBorder>
		</EaseView>
	);
}
