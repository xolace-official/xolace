import type { VoiceSlug } from "@xolace/backend/convex/lib/voices";
import { View } from "react-native";
import Animated, {
	useAnimatedStyle,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { EASING, EaseView } from "@/design/ease";
import { loopProps } from "@/design/ease-loops";
import { cn } from "@/lib/cn";
import { playSoftPress } from "@/lib/haptics";
import { TALK_COPY } from "../copy";
import { OUT_EASE, timing } from "../motion/talk-motion";
import { CAST, castVoice } from "../talk-model";
import { VoiceOrb } from "./voice-orb";

const ORB = 26;
const PLAY_SCALE = 1.14;
const PLAY_MS = 300;
const BAR_DELAYS = [0, 150, 300] as const;
const BAR_HALF_MS = 300;
const BAR_REST = 0.6;
const TEXT = "text-[13px] leading-[18px]";

function Bar({ delay, reduced }: { delay: number; reduced: boolean }) {
	const loop = loopProps({
		delay,
		easing: EASING.inOutQuad,
		from: { scaleY: reduced ? BAR_REST : 0.3 },
		periodMs: BAR_HALF_MS * 2,
		reduced,
		to: { scaleY: 1 },
	});
	return (
		<EaseView
			className="h-3.5 w-[2.5px] rounded-[2px] bg-accent"
			key={String(reduced)}
			{...loop}
		/>
	);
}

function Pill({
	voice,
	selected,
	playing,
	running,
	reduced,
	onPress,
}: {
	voice: (typeof CAST)[number];
	selected: boolean;
	playing: boolean;
	running: boolean;
	reduced: boolean;
	onPress: () => void;
}) {
	const orb = useAnimatedStyle(() => ({
		transform: [
			{
				scale: withTiming(
					playing ? PLAY_SCALE : 1,
					timing(reduced ? 0 : PLAY_MS, OUT_EASE)
				),
			},
		],
	}));
	return (
		<PressScale
			accessibilityHint={TALK_COPY.start.voiceHint(voice.trait)}
			accessibilityLabel={TALK_COPY.start.voice(voice.name)}
			accessibilityRole="radio"
			accessibilityState={{ selected }}
			className={cn(
				"h-10 flex-row items-center gap-1.5 rounded-full pr-3 pl-1.5",
				selected
					? "border-[1.5px] border-accent bg-accent-wash"
					: "border border-separator"
			)}
			haptic={playSoftPress}
			onPress={onPress}
			style={{ borderCurve: "continuous" }}
		>
			<Animated.View style={orb}>
				<VoiceOrb running={running} size={ORB} voice={voice.id} />
			</Animated.View>
			<AppText
				className="text-[14px] leading-[18px]"
				color={selected ? "foreground" : "muted"}
				variant="footnote"
				weight="medium"
			>
				{voice.name}
			</AppText>
			{playing ? (
				<View className="-ml-0.5 h-3.5 flex-row items-center gap-0.5">
					{BAR_DELAYS.map((d) => (
						<Bar delay={d} key={d} reduced={reduced} />
					))}
				</View>
			) : null}
		</PressScale>
	);
}

type Props = {
	voice: VoiceSlug;
	playing: VoiceSlug | null;
	onPick: (voice: VoiceSlug) => void;
	running: boolean;
	reduced: boolean;
};

export function VoicePills({
	voice,
	playing,
	onPick,
	running,
	reduced,
}: Props) {
	const current = castVoice(voice);
	return (
		<View className="items-center gap-1.5">
			<AppText
				accessibilityElementsHidden
				center
				className={TEXT}
				color="muted"
				importantForAccessibility="no"
				variant="footnote"
			>
				<AppText className={TEXT} variant="footnote" weight="semibold">
					{current.name}
				</AppText>
				{` · ${current.trait}`}
			</AppText>
			<View
				accessibilityRole="radiogroup"
				className="flex-row flex-wrap justify-center gap-1.5 px-2"
			>
				{CAST.map((v) => (
					<Pill
						key={v.id}
						onPress={() => onPick(v.id)}
						playing={playing === v.id}
						reduced={reduced}
						running={running}
						selected={v.id === voice}
						voice={v}
					/>
				))}
			</View>
		</View>
	);
}
