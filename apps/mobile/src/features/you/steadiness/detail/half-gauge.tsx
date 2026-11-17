import { Canvas, Path, Skia } from "@shopify/react-native-skia";
import { useEffect } from "react";
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

// Production's HalfGauge: 17 ticks from 180° over −180°, radius 120, 30 long, 9 wide, the
// centre 18 pt below the card's top edge, in a 150 pt window.
const W = 290;
const HALF_H = 150;
const TICKS = 17;
const RADIUS = 120;
const LEN = 30;
const WIDTH = 9;
const CX = W / 2;
const CY = 18;
/** Your usual reaches a quarter of a tick further out. */
const MARK_OUT = LEN * 0.25;
const PATH = tickPath(TICKS, 180, -180, RADIUS, LEN, CX, CY);
/** From one part to the next; the first fill waits for the rings. */
const REFILL_MS = 600;
const FIRST_DELAY_MS = 500;
const NUMBER_LINE = 46;

const markIndex = (usual: number) => {
	"worklet";
	return Math.max(0, Math.round((usual / 100) * TICKS) - 1);
};

/**
 * The half gauge. Kept mounted from part to part: the ticks run from the old value to the new
 * on one shared value, the number rolls, your usual's mark moves.
 */
export function HalfGauge({
	value,
	usual,
	color,
	label,
}: {
	value: number;
	usual: number;
	color: string;
	label: string;
}) {
	const fg = useTokenColor("foreground");
	const track = useTrack();
	const reduced = useEffectiveReducedMotion();
	const dv = useSharedValue(reduced ? value : 0);
	const du = useSharedValue(usual);
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
		if (reduced) {
			dv.set(value);
			du.set(usual);
			return;
		}
		const ease = {
			duration: REFILL_MS,
			easing: Easing.out(Easing.cubic),
			...PLAY_AS_CHOSEN,
		};
		const first = dv.get() === 0;
		dv.set(
			first
				? withDelay(FIRST_DELAY_MS, withTiming(value, ease))
				: withTiming(value, ease)
		);
		du.set(withTiming(usual, ease));
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
				<Path
					color={fg}
					path={mark}
					strokeCap="round"
					strokeWidth={WIDTH}
					style="stroke"
				/>
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

/** Free: the gauge unfilled, a lock where the number goes. Never a hint of direction. */
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
