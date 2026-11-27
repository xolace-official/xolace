import { View } from "react-native";
import { Presets } from "react-native-pulsar";
import Animated, {
	useAnimatedStyle,
	withTiming,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { PALETTES } from "@/components/xolace-face/face-palette";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { FIRST_LOOK, type VoiceId } from "../copy";
import { VOICE_PALETTE } from "../first-look-model";

const FLAME =
	"M50 97C25 97 9 82 9 61C9 43 19 31 31 22C39 16 47 10 51 2C55 10 55 18 60 23C64 20 70 16 77 12C78 19 79 25 82 31C88 40 91 50 91 61C91 82 75 97 50 97Z";
const RING_FADE_MS = 250;
const NAME_MAX_SCALE = 1.15;

type VoiceProps = {
	id: VoiceId;
	name: string;
	on: boolean;
	onPick: (voice: VoiceId) => void;
};

function Voice({ id, name, on, onPick }: VoiceProps) {
	const g = PALETTES[VOICE_PALETTE[id]];
	const ring = useAnimatedStyle(() => ({
		opacity: withTiming(on ? 1 : 0, {
			duration: RING_FADE_MS,
			...PLAY_AS_CHOSEN,
		}),
	}));
	return (
		<PressScale
			accessibilityLabel={name}
			accessibilityRole="radio"
			accessibilityState={{ checked: on, selected: on }}
			className="w-13 items-center gap-[5px]"
			haptic={Presets.System.selection}
			onPress={() => onPick(id)}
		>
			<View className="size-11 items-center justify-center rounded-full bg-surface-secondary">
				<Svg height={24} viewBox="0 0 100 100" width={24}>
					<Defs>
						<LinearGradient
							gradientUnits="userSpaceOnUse"
							id={`flame-${id}`}
							x1={18}
							x2={82}
							y1={96}
							y2={4}
						>
							{g.stops.map((c, i) => (
								<Stop key={c} offset={g.positions[i] ?? 0} stopColor={c} />
							))}
						</LinearGradient>
					</Defs>
					<Path d={FLAME} fill={`url(#flame-${id})`} />
				</Svg>
				<Animated.View
					className="absolute top-0 left-0 size-11 rounded-full border-2 border-ember"
					pointerEvents="none"
					style={ring}
				/>
			</View>
			<AppText
				color={on ? "foreground" : "muted"}
				maxFontSizeMultiplier={NAME_MAX_SCALE}
				numberOfLines={1}
				variant="caption"
				weight="medium"
			>
				{name}
			</AppText>
		</PressScale>
	);
}

type Props = { onPick: (voice: VoiceId) => void; voice: VoiceId };

export function VoicesPreview({ onPick, voice }: Props) {
	return (
		<View
			accessibilityLabel={FIRST_LOOK.a11y.voices}
			accessibilityRole="radiogroup"
			className="flex-row justify-between"
		>
			{FIRST_LOOK.voices.map((v) => (
				<Voice
					id={v.id}
					key={v.id}
					name={v.name}
					on={v.id === voice}
					onPick={onPick}
				/>
			))}
		</View>
	);
}
