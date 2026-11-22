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
	right: boolean;
	reduced: boolean;
	label: SharedValue<number>;
	page: string;
};

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
