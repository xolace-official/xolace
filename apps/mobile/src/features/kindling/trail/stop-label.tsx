import { View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { cn } from "@/lib/cn";
import { SwapText } from "../swap-text";

export const LABEL_W = 148;
const TITLE_HALO = 10;
const CHECK = 11;

type Props = {
	title: string;
	eyebrow: string;
	eyebrowColor: string;
	/** A right-hand stop: the label sits on its left, right-aligned. */
	right: boolean;
	reduced: boolean;
	/** The label's opacity (.45 when later, .6 when passed). */
	label: SharedValue<number>;
	/** The page colour, for the title's halo. */
	page: string;
};

/**
 * The label beside a stop (§2.4), with no card behind it: the eyebrow swaps like fuse's label
 * ("To hear" → "Tended"), and the title has a soft page-coloured halo so it reads over the road.
 */
export function StopLabel({
	title,
	eyebrow,
	eyebrowColor,
	right,
	reduced,
	label,
	page,
}: Props) {
	const style = useAnimatedStyle(() => ({ opacity: label.get() }));
	return (
		<Animated.View style={[{ width: LABEL_W }, style]}>
			<View className={right ? "items-end" : "items-start"}>
				<SwapText
					className="text-[10.5px] uppercase leading-[14px] tracking-[0.95px]"
					color={eyebrowColor}
					mode="lift"
					reduced={reduced}
					text={eyebrow}
					variant="caption"
					weight="bold"
				/>
			</View>
			<AppText
				className={cn(
					"mt-0.5 text-[15px] leading-[19px]",
					right ? "text-right" : "text-left"
				)}
				numberOfLines={3}
				style={{ textShadowColor: page, textShadowRadius: TITLE_HALO }}
				variant="callout"
				weight="semibold"
			>
				{title}
			</AppText>
		</Animated.View>
	);
}

type BadgeProps = {
	right: boolean;
	scale: SharedValue<number>;
	onEmber: string;
};

/** The check badge: 26 pt ember with a 3 pt page-coloured ring, on the stop's inner side. */
export function CheckBadge({ right, scale, onEmber }: BadgeProps) {
	const style = useAnimatedStyle(() => ({
		transform: [{ scale: scale.get() }],
	}));
	return (
		<Animated.View
			className={cn(
				"absolute -bottom-0.75 size-6.5 items-center justify-center rounded-full border-3 border-background bg-ember",
				right ? "-left-0.75" : "-right-0.75"
			)}
			style={style}
		>
			<Icon
				color={onEmber}
				name={{ android: "check", ios: "checkmark" }}
				size={CHECK}
				weight="bold"
			/>
		</Animated.View>
	);
}
