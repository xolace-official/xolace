import { Pressable } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { playSoftPress } from "@/lib/haptics";

const IN_MS = 220;
const OUT_MS = 150;

/** The board's ⓘ: an 18 pt ring with an i. */
export function InfoButton({
	label,
	onPress,
}: {
	label: string;
	onPress: () => void;
}) {
	return (
		<PressScale
			accessibilityLabel={label}
			accessibilityRole="button"
			className="size-4.5 items-center justify-center rounded-full border-[1.2px] border-subtle"
			haptic={playSoftPress}
			hitSlop={10}
			onPress={onPress}
		>
			<AppText
				className="text-[11px] leading-[13px]"
				color="subtle"
				variant="caption"
				weight="bold"
			>
				i
			</AppText>
		</PressScale>
	);
}

/** An ⓘ's explanation, in place over the card (the board's `.tipb`). Tap it to close. */
export function InfoTip({
	title,
	body,
	top,
	onClose,
}: {
	title: string;
	body: string;
	top: number;
	onClose: () => void;
}) {
	return (
		<Animated.View
			className="absolute right-3 left-3 z-5 rounded-[16px] border-[0.5px] border-continuous border-separator bg-surface-secondary px-3.25 py-2.75 shadow-card"
			entering={FadeIn.duration(IN_MS)}
			exiting={FadeOut.duration(OUT_MS)}
			style={{ top }}
		>
			<Pressable accessibilityLabel={`${title}. ${body}`} onPress={onClose}>
				<AppText
					className="mb-0.5 text-[13px] leading-[17px]"
					variant="footnote"
					weight="bold"
				>
					{title}
				</AppText>
				<AppText className="text-[12.5px] leading-[17.5px]" variant="footnote">
					{body}
				</AppText>
			</Pressable>
		</Animated.View>
	);
}
