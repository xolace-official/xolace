import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { Icon, type IconName } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { useScheme } from "@/design/scheme";
import { useTokenColor } from "@/lib/use-token-color";
import { TALK_COPY } from "../copy";
import { GO, LAYOUT, OUT_EASE, seg } from "../motion/talk-motion";
import type { TalkMotion } from "../motion/use-talk-motion";

const GLASS = isLiquidGlassAvailable();
const ROUND = { borderRadius: LAYOUT.composerH / 2 } as const;
const MIC: IconName = { android: "mic", ios: "mic.fill" };
const MIC_OFF: IconName = { android: "mic_off", ios: "mic.slash.fill" };
const FROM_SCALE = 0.6;

export function MuteButton({
	motion,
	top,
	lift,
	before,
	muted,
	onMute,
}: {
	motion: TalkMotion;
	top: number;
	lift: SharedValue<number>;
	before: boolean;
	muted: boolean;
	onMute: () => void;
}) {
	const scheme = useScheme();
	const foreground = useTokenColor("foreground");
	const subtle = useTokenColor("subtle");
	const style = useAnimatedStyle(() => {
		const g = motion.go.get();
		const reduced = motion.reduced.get();
		return {
			opacity: reduced
				? seg(g, GO.reduced / 2, GO.reduced / 2)
				: seg(g, GO.muteAt, GO.muteFade),
			top: top - lift.get(),
			transform: [
				{
					scale: reduced
						? 1
						: FROM_SCALE +
							(1 - FROM_SCALE) * seg(g, GO.muteAt, GO.muteScale, OUT_EASE),
				},
			],
		};
	});
	const button = (
		<PressScale
			accessibilityLabel={muted ? TALK_COPY.live.unmute : TALK_COPY.live.mute}
			className={
				GLASS
					? "flex-1 items-center justify-center"
					: "flex-1 items-center justify-center border-[0.5px] border-separator bg-glass"
			}
			onPress={onMute}
			style={GLASS ? undefined : ROUND}
		>
			<Icon
				color={muted ? subtle : foreground}
				name={muted ? MIC_OFF : MIC}
				size={18}
			/>
		</PressScale>
	);
	return (
		<Animated.View
			className="absolute"
			pointerEvents={before ? "none" : "auto"}
			style={[
				{
					height: LAYOUT.composerH,
					left: LAYOUT.gutter,
					width: LAYOUT.composerH,
				},
				style,
			]}
		>
			{GLASS ? (
				<GlassView
					colorScheme={scheme}
					glassEffectStyle="regular"
					isInteractive
					style={[{ flex: 1 }, ROUND]}
				>
					{button}
				</GlassView>
			) : (
				button
			)}
		</Animated.View>
	);
}
