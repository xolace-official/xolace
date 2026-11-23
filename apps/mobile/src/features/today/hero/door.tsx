import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { keyframes } from "@/design/keyframes";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { useTokenColors } from "@/lib/use-token-color";
import { COPY } from "../copy";
import { useTodayFrame } from "../today-frame";
import type { Door as DoorId } from "../today-model";
import { riseFn } from "../today-motion";
import { DOOR_LOOK } from "./door-look";
import { BURST, burstFromX } from "./hero-model";

const ICON = 19;
const FIT = 0.75;
const TRAVEL = [
	[0, 1],
	[BURST.peakAt, 0],
	[1, 0],
] as const;
const OPACITY = [
	[0, 0],
	[BURST.opaqueAt, 1],
] as const;
const SCALE = [
	[0, BURST.fromScale],
	[BURST.peakAt, BURST.peak],
	[1, 1],
] as const;

export function Door({
	id,
	index,
	count,
	onPick,
}: {
	id: DoorId;
	index: number;
	count: number;
	onPick: (d: DoorId) => void;
}) {
	const door = DOOR_LOOK[id];
	const { reduced } = useTodayFrame();
	const [ink, label, sub] = useTokenColors([
		door.ink,
		"door-label",
		"door-sub",
	]);
	const copy = COPY.doors[id];
	const p = useSharedValue(reduced ? 1 : 0);
	useEffect(() => {
		if (reduced) {
			return;
		}
		p.set(
			withDelay(
				index * BURST.stagger,
				withTiming(1, {
					duration: BURST.ms,
					easing: Easing.linear,
					...PLAY_AS_CHOSEN,
				}),
				PLAY_AS_CHOSEN.reduceMotion
			)
		);
	}, [index, p, reduced]);
	const fromX = burstFromX(index, count);
	const style = useAnimatedStyle(() => {
		const v = p.get();
		const move = keyframes(v, TRAVEL, riseFn);
		return {
			opacity: keyframes(v, OPACITY, riseFn),
			transform: [
				{ translateX: fromX * move },
				{ translateY: BURST.fromY * move },
				{ scale: keyframes(v, SCALE, riseFn) },
			],
		};
	});
	return (
		<Animated.View className="flex-1" style={style}>
			<PressScale
				accessibilityLabel={`${copy.label}, ${copy.sub}`}
				accessibilityRole="button"
				className={`flex-1 items-center justify-center gap-1.5 border-continuous ${door.tile}`}
				onPress={() => onPick(id)}
				style={{ borderRadius: BURST.tileR }}
			>
				<View className="size-10 items-center justify-center rounded-full bg-white/72">
					<Icon color={ink} name={door.icon} size={ICON} weight="semibold" />
				</View>
				<AppText
					adjustsFontSizeToFit
					className="text-[14.5px] leading-[18px]"
					maxFontSizeMultiplier={1.3}
					minimumFontScale={FIT}
					numberOfLines={1}
					style={{ color: label }}
					variant="footnote"
					weight="semibold"
				>
					{copy.label}
				</AppText>
				<AppText
					adjustsFontSizeToFit
					className="-mt-1 text-[11.5px] leading-[14px]"
					maxFontSizeMultiplier={1.3}
					minimumFontScale={FIT}
					numberOfLines={1}
					style={{ color: sub }}
					variant="caption"
					weight="medium"
				>
					{copy.sub}
				</AppText>
			</PressScale>
		</Animated.View>
	);
}
