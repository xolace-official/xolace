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
import { Icon, type IconName } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { keyframes } from "@/design/keyframes";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { useTokenColors } from "@/lib/use-token-color";
import { COPY } from "../copy";
import { useTodayFrame } from "../today-frame";
import type { Door as DoorId } from "../today-model";
import { riseFn } from "../today-motion";
import { BURST, burstFromX } from "./hero-model";

/** Each door's look: its tile and icon ink are `--color-door-*` (global.css). */
const LOOK: Record<DoorId, { icon: IconName; tile: string; ink: string }> = {
	sit: {
		icon: { android: "waves", ios: "water.waves" },
		ink: "door-sit-ink",
		tile: "bg-door-sit",
	},
	talk: {
		icon: { android: "mic", ios: "mic" },
		ink: "door-talk-ink",
		tile: "bg-door-talk",
	},
	vent: {
		icon: { android: "graphic_eq", ios: "waveform.path.ecg" },
		ink: "door-vent-ink",
		tile: "bg-door-vent",
	},
};
const ICON = 19;
/** Three doors share a narrow card: a long label shrinks to fit (down to 75%) rather than cut off. */
const FIT = 0.75;
/** burst keyframes: travel 1 → 0 by 74%, opaque by 55%, scale .2 → 1.05 at 74% → 1. */
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

/** A door bursts out of the hint line (bubble-media-burst), overshooting to 1.05 at 74%. */
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
	const door = LOOK[id];
	const { reduced } = useTodayFrame();
	const [ink, label, sub] = useTokenColors([
		door.ink,
		"door-label",
		"door-sub",
	]);
	const copy = COPY.doors[id];
	// Reduced: the doors are simply there (the card's body has faded out under them).
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
