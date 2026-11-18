import { View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { PRESETS, poseForSteadiness } from "@/components/xolace-face/pose";
import { useFace } from "@/components/xolace-face/use-face";
import { XolaceFace } from "@/components/xolace-face/xolace-face";
import { COPY } from "@/features/you/copy";
import { Surface } from "@/features/you/surface";
import { playSoftPress } from "@/lib/haptics";

const S = COPY.steadinessScreen;
/** The chip (steadiness.md §4.2): 104 × 36, radius 18, a 24 pt face, the number at 17. */
const CHIP_W = 104;
const CHIP_H = 36;
const CHIP_FACE = 24;
/** It rises 14 pt from scale .6 into the title's place. */
const RISE = 14;
const FROM_SCALE = 0.6;

/**
 * The bar: "Steadiness", until the dial's number goes under it; then the dial lands there as a
 * chip, the face and the number (native-cook's health-age-dial). Tap it to go back up. `chip`
 * runs 0 → 1 on the UI thread; `docked` is React's copy of the crossing.
 */
export function BarTitle({
	chip,
	docked,
	score,
	reduced,
	onTop,
}: {
	chip: SharedValue<number>;
	docked: boolean;
	score: number | null;
	reduced: boolean;
	onTop: () => void;
}) {
	const face = useFace(
		score === null ? PRESETS.waiting : poseForSteadiness(score),
		docked
	);
	const titleStyle = useAnimatedStyle(() => ({
		opacity: 1 - Math.min(1, chip.get()),
	}));
	const chipStyle = useAnimatedStyle(() => {
		const on = chip.get();
		return {
			opacity: Math.min(1, on),
			transform: reduced
				? []
				: [
						{ translateY: RISE * (1 - on) },
						{ scale: FROM_SCALE + (1 - FROM_SCALE) * on },
					],
		};
	});
	return (
		<View
			className="h-10 items-center justify-center"
			style={{ width: CHIP_W + 40 }}
		>
			<Animated.View className="absolute" style={titleStyle}>
				<AppText
					accessibilityElementsHidden={docked}
					className="text-[17px] leading-[22px]"
					importantForAccessibility={docked ? "no-hide-descendants" : "auto"}
					variant="headline"
					weight="semibold"
				>
					{S.title}
				</AppText>
			</Animated.View>
			{score === null ? null : (
				<Animated.View
					className="absolute"
					pointerEvents={docked ? "auto" : "none"}
					style={chipStyle}
				>
					<PressScale
						accessibilityElementsHidden={!docked}
						accessibilityLabel={S.chipLabel(score)}
						accessibilityRole="button"
						haptic={playSoftPress}
						importantForAccessibility={docked ? "auto" : "no-hide-descendants"}
						onPress={onTop}
					>
						<Surface
							className="flex-row items-center justify-center gap-1.25"
							radius={CHIP_H / 2}
							style={{ height: CHIP_H, width: CHIP_W }}
						>
							<XolaceFace face={face} size={CHIP_FACE} />
							<AppText
								className="font-display-bold text-[17px] tabular-nums leading-[22px] tracking-[-0.34px]"
								variant="display"
							>
								{score}
							</AppText>
							<AppText
								className="mt-0.75 text-[11px] leading-3.5"
								color="subtle"
								variant="caption"
							>
								{COPY.steadiness.outOf}
							</AppText>
						</Surface>
					</PressScale>
				</Animated.View>
			)}
		</View>
	);
}
