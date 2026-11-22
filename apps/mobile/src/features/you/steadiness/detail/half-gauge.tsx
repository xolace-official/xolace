import { Canvas, Path, Skia } from "@shopify/react-native-skia";
import { useEffect, useRef } from "react";
import { View } from "react-native";
import {
	Easing,
	useDerivedValue,
	useSharedValue,
	withDelay,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { RollDigits } from "@/components/shared/roll-digits";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { COPY } from "@/features/you/copy";
import {
	tickPath,
	useSnappedEnd,
	useTrack,
} from "@/features/you/steadiness/ticks";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useTokenColor } from "@/lib/use-token-color";

const W = 290;
const HALF_H = 150;
const TICKS = 17;
const RADIUS = 120;
const LEN = 30;
const WIDTH = 9;
const CX = W / 2;
const CY = 18;
const MARK_OUT = LEN * 0.25;
const PATH = tickPath(TICKS, 180, -180, RADIUS, LEN, CX, CY);
const REFILL_MS = 600;
const FIRST_DELAY_MS = 500;
const NUMBER_LINE = 46;

const markIndex = (usual: number) => {
	"worklet";
	return Math.max(0, Math.round((usual / 100) * TICKS) - 1);
};

export function HalfGauge({
	value,
	usual,
	color,
	label,
}: {
	value: number;
	usual: number | null;
	color: string;
	label: string;
}) {
	const fg = useTokenColor("foreground");
	const track = useTrack();
	const reduced = useEffectiveReducedMotion();
	const dv = useSharedValue(reduced ? value : 0);
	const du = useSharedValue(usual ?? 0);
	const marked = useRef(usual !== null);
	const progress = useDerivedValue(() => dv.get() / 100);
	const { end, opacity } = useSnappedEnd(progress, TICKS, TICKS);
	const mark = useDerivedValue(() => {
		const a =
			((180 - (180 / (TICKS - 1)) * markIndex(du.get())) * Math.PI) / 180;
		const p = Skia.PathBuilder.Make();
		p.moveTo(
			CX + Math.cos(a) * (RADIUS - LEN),
			CY + Math.sin(a) * (RADIUS - LEN)
		);
		p.lineTo(
			CX + Math.cos(a) * (RADIUS + MARK_OUT),
			CY + Math.sin(a) * (RADIUS + MARK_OUT)
		);
		return p.build();
	});
	useEffect(() => {
		const ease = {
			duration: REFILL_MS,
			easing: Easing.out(Easing.cubic),
			...PLAY_AS_CHOSEN,
		};
		const glide = !reduced && marked.current;
		marked.current = usual !== null;
		if (usual !== null) {
			du.set(glide ? withTiming(usual, ease) : usual);
		}
		if (reduced) {
			dv.set(value);
			return;
		}
		const first = dv.get() === 0;
		dv.set(
			first
				? withDelay(FIRST_DELAY_MS, withTiming(value, ease))
				: withTiming(value, ease)
		);
	}, [value, usual, reduced, dv, du]);

	return (
		<View
			accessibilityLabel={label}
			accessibilityRole="image"
			accessible
			className="-mx-5 items-center"
			style={{ height: HALF_H }}
		>
			<Canvas style={{ height: HALF_H, width: W }}>
				<Path
					color={track}
					path={PATH}
					strokeCap="round"
					strokeWidth={WIDTH}
					style="stroke"
				/>
				<Path
					color={color}
					end={end}
					opacity={opacity}
					path={PATH}
					start={0}
					strokeCap="round"
					strokeWidth={WIDTH}
					style="stroke"
				/>
				{usual === null ? null : (
					<Path
						color={fg}
						path={mark}
						strokeCap="round"
						strokeWidth={WIDTH}
						style="stroke"
					/>
				)}
			</Canvas>
			<View className="absolute top-5.5 right-0 left-0 items-center">
				<AppText
					className="text-[13px] leading-[17px]"
					color="subtle"
					variant="footnote"
				>
					{COPY.steadinessScreen.now}
				</AppText>
				<RollDigits
					className="font-display-bold text-[40px] tabular-nums"
					lineHeight={NUMBER_LINE}
					value={value}
					variant="display"
				/>
			</View>
		</View>
	);
}

export function LockedGauge() {
	const subtle = useTokenColor("subtle");
	const track = useTrack();
	return (
		<View
			accessibilityElementsHidden
			className="-mx-5 items-center"
			importantForAccessibility="no-hide-descendants"
			style={{ height: HALF_H }}
		>
			<Canvas style={{ height: HALF_H, width: W }}>
				<Path
					color={track}
					path={PATH}
					strokeCap="round"
					strokeWidth={WIDTH}
					style="stroke"
				/>
			</Canvas>
			<View className="absolute top-11 right-0 left-0 items-center">
				<Icon
					color={subtle}
					name={{ android: "lock", ios: "lock.fill" }}
					size={22}
				/>
			</View>
		</View>
	);
}
