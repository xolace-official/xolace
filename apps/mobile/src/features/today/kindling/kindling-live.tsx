import { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { QUICK_ROLL_MS, RollDigits } from "@/components/shared/roll-digits";
import { clearOf } from "@/design/clear-of";
import { PLAY_AS_CHOSEN, REDUCED_FADE_MS } from "@/design/springs";
import { useClock } from "@/lib/motion/clock";
import { useTokenColors } from "@/lib/use-token-color";
import { COPY } from "../copy";
import { SoftText } from "../soft-text";
import { useToday } from "../today-data";
import { useTodayFrame } from "../today-frame";
import { EASE_CSS, glideFn } from "../today-motion";
import { pathGeometry } from "./kindling-geometry";
import { BEAT, type KindlingView, nextRow, PATH_H } from "./kindling-model";
import { KindlingPath } from "./kindling-path";
import { StepTargets } from "./step-targets";
import { useTend } from "./use-tend";

const PATH_FPS = 30;
const COUNT_LINE = 18;
const WASH = { x: -48, y: -6 } as const;
const washWidth = (lit: number) => 40 + lit * 70;
const WASH_ALPHA = 0.17;
const washOf = (ember: string) =>
	`radial-gradient(closest-side, ${clearOf(ember, WASH_ALPHA)}, ${clearOf(ember)})`;
const PEEK_MS = 420;
const TOKENS = [
	"surface",
	"surface-secondary",
	"subtle",
	"accent",
	"ember",
	"accent-ink",
	"today-kindling-check",
] as const;

type Props = {
	kindling: KindlingView;
	width: number;
	onScreen: SharedValue<boolean>;
};

export function KindlingLive({ kindling, width, onScreen }: Props) {
	const [surface, well, subtle, violet, ember, accentInk, check] =
		useTokenColors(TOKENS);
	const { actions } = useToday();
	const { live, reduced, low } = useTodayFrame();
	const states = kindling.twigs.map((t) => t.state);
	const kin = useTend(kindling.id, states, reduced);
	const clock = useClock(live, onScreen, PATH_FPS);
	const total = kindling.twigs.length;
	const geo = pathGeometry(width, total);

	const lit = kin.shown.filter((s) => s === "done").length;
	const wash = useSharedValue(washWidth(lit));
	useEffect(() => {
		wash.set(
			withTiming(washWidth(lit), {
				duration: reduced ? REDUCED_FADE_MS : BEAT.wash,
				easing: EASE_CSS,
				...PLAY_AS_CHOSEN,
			})
		);
	}, [lit, reduced, wash]);
	const washStyle = useAnimatedStyle(() => ({ width: wash.get() }));

	const { eyebrow, title } = nextRow(kindling.twigs, kin.shown, kin.peek);
	const tended = kin.peek < 0 && kin.fresh;
	const textKey =
		kin.peek >= 0 ? `p${kin.peekN}` : `t${kin.tendN}-${kin.peekN}`;
	const blurIn = {
		blur: 6,
		delay: tended ? BEAT.nextAt : 0,
		duration: tended ? BEAT.next : PEEK_MS,
		ease: glideFn,
		play: !reduced && (kin.peek >= 0 || tended),
		rise: 4,
	};

	return (
		<View>
			<Animated.View
				className="absolute h-32.5"
				pointerEvents="none"
				style={[
					{ backgroundImage: washOf(ember), left: WASH.x, top: WASH.y },
					washStyle,
				]}
			/>
			<Pressable
				accessibilityLabel={COPY.kindling.open}
				accessibilityRole="button"
				accessibilityValue={{
					text: COPY.kindling.a11y.count(kin.count, total),
				}}
				className="min-h-5.5 flex-row items-center justify-between gap-3"
				onPress={actions.openKindling}
			>
				<AppText className="text-[16.5px]" variant="subhead" weight="semibold">
					{COPY.kindling.title}
				</AppText>
				<View className="flex-row items-center">
					{/* Plain views: the card rises in, and a SwiftUI-hosted number is left behind by it. */}
					<RollDigits
						className="text-muted tabular-nums"
						durationMs={QUICK_ROLL_MS}
						lineHeight={COUNT_LINE}
						maxScale={1}
						rollIn={false}
						value={kin.count}
						variant="footnote"
					/>
					<AppText color="muted" variant="footnote">
						{COPY.kindling.of(total)}
					</AppText>
				</View>
			</Pressable>
			<View className="mt-2 mb-1.5" style={{ height: PATH_H, width }}>
				<KindlingPath
					beat={kin.beat}
					clock={clock}
					colours={{ check, ember, surface, violet, waitStroke: subtle, well }}
					current={kin.current}
					dash={subtle}
					done={kin.shown.map((s) => s === "done")}
					geo={geo}
					justDone={kin.justDone}
					low={low}
					width={width}
				/>
				<StepTargets
					current={kin.current}
					nodes={geo.nodes}
					onPeek={kin.peekAt}
					peek={kin.peek}
					shown={kin.shown}
					twigs={kindling.twigs}
				/>
			</View>
			<View className="flex-row items-center gap-3">
				<View className="flex-1 gap-[3px]">
					<SoftText
						{...blurIn}
						className="text-[11.5px] leading-[14px] tracking-[0.8px]"
						color="accentInk"
						inkColor={accentInk}
						key={`e${textKey}`}
						text={eyebrow}
						variant="caption"
						weight="bold"
					/>
					<SoftText
						{...blurIn}
						className="text-[16.5px]"
						key={`t${textKey}`}
						text={title}
						variant="subhead"
						weight="semibold"
					/>
				</View>
				<PressScale
					accessibilityRole="button"
					className="min-h-10 justify-center rounded-full bg-accent-wash px-4.5"
					onPress={actions.openKindling}
				>
					<AppText color="accentInk" variant="callout" weight="semibold">
						{kin.current >= total ? COPY.kindling.seeIt : COPY.kindling.begin}
					</AppText>
				</PressScale>
			</View>
		</View>
	);
}
