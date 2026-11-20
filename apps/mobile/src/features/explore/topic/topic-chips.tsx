import { useEffect } from "react";
import { Presets } from "react-native-pulsar";
import Animated, {
	interpolateColor,
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { AnimatedAppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { LinearGradient } from "@/components/shared/styled";
import { clearOf } from "@/design/clear-of";
import { PLAY_AS_CHOSEN, REDUCED_FADE_MS } from "@/design/springs";
import { COPY, type TopicFilter } from "@/features/explore/copy";
import {
	EX_TIMING,
	EXS,
	PIN_AT,
	TOPIC,
} from "@/features/explore/explore-style";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useTokenColors } from "@/lib/use-token-color";

const C = TOPIC.chips;

export function TopicChips({
	value,
	onChange,
	y,
	pinned,
}: {
	value: TopicFilter;
	onChange: (v: TopicFilter) => void;
	y: SharedValue<number>;
	pinned: boolean;
}) {
	const [page] = useTokenColors(["background"]);
	const pin = useAnimatedStyle(() => ({
		transform: [{ translateY: Math.max(0, y.get() - PIN_AT) }],
	}));
	const r = pinned ? 0 : TOPIC.sheetR;
	return (
		<Animated.View
			accessibilityLabel={COPY.show}
			className="z-2 flex-row border-continuous bg-background"
			role="group"
			style={[
				{
					borderTopLeftRadius: r,
					borderTopRightRadius: r,
					gap: C.gap,
					paddingBottom: C.bottom,
					paddingHorizontal: C.x,
					paddingTop: C.top,
				},
				pin,
			]}
		>
			{COPY.chips.map((c) => (
				<Chip
					key={c.id}
					label={c.label}
					on={value === c.id}
					onPress={() => onChange(c.id)}
				/>
			))}
			{pinned ? (
				<LinearGradient
					className="absolute inset-x-0"
					colors={[page, clearOf(page)]}
					pointerEvents="none"
					style={{ bottom: -C.fade, height: C.fade }}
				/>
			) : null}
		</Animated.View>
	);
}

function Chip({
	label,
	on,
	onPress,
}: {
	label: string;
	on: boolean;
	onPress: () => void;
}) {
	const [surface, foreground, separator, page] = useTokenColors([
		"surface",
		"foreground",
		"separator",
		"background",
	]);
	const ringOff = clearOf(separator);
	const reduced = useEffectiveReducedMotion();
	const p = useSharedValue(on ? 1 : 0);
	useEffect(() => {
		p.set(
			withTiming(on ? 1 : 0, {
				duration: reduced ? REDUCED_FADE_MS : EX_TIMING.chipMs,
				...PLAY_AS_CHOSEN,
			})
		);
	}, [on, p, reduced]);
	const shell = useAnimatedStyle(() => ({
		backgroundColor: interpolateColor(p.get(), [0, 1], [surface, foreground]),
		borderColor: interpolateColor(p.get(), [0, 1], [separator, ringOff]),
	}));
	const text = useAnimatedStyle(() => ({
		color: interpolateColor(p.get(), [0, 1], [foreground, page]),
	}));

	return (
		<PressScale
			accessibilityLabel={label}
			accessibilityRole="button"
			accessibilityState={{ selected: on }}
			haptic={on ? undefined : Presets.System.selection}
			onPress={onPress}
		>
			<Animated.View
				className="justify-center border"
				style={[
					{
						borderRadius: EXS.chip.r,
						height: EXS.chip.h,
						paddingHorizontal: EXS.chip.padH,
					},
					shell,
				]}
			>
				<AnimatedAppText style={text} variant="callout" weight="medium">
					{label}
				</AnimatedAppText>
			</Animated.View>
		</PressScale>
	);
}
