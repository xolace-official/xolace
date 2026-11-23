import { useEffect } from "react";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withTiming,
} from "react-native-reanimated";
import { Equaliser } from "@/components/shared/equaliser";
import { GlassButton } from "@/components/shared/glass-button";
import { Icon, type IconName } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { playSoftPress } from "@/lib/haptics";
import { useTokenColors } from "@/lib/use-token-color";
import { COPY } from "../copy";
import { READ_ALOUD_AFTER_MS } from "../motion";
import { useReflect } from "../reflect-data";
import { useReflectDraw } from "../reflect-draw";

const IN = {
	ease: Easing.bezier(0.3, 1.3, 0.5, 1),
	fadeMs: 300,
	from: 0.6,
	scaleMs: 400,
} as const;
const SPEAKER: IconName = { android: "volume_up", ios: "speaker.wave.2.fill" };
const PAUSE: IconName = { android: "pause", ios: "pause.fill" };
const SPEAKER_SIZE = 16;
const PAUSE_SIZE = 12;

export function ReadAloud({ landN }: { landN: number }) {
	const { state, actions } = useReflect();
	const { audio, heavy } = state;
	const { reduced } = useReflectDraw();
	const [accentInk, background] = useTokenColors(["accent-ink", "background"]);
	const shown = useSharedValue(0);
	const scale = useSharedValue<number>(IN.from);
	const on = audio.ready && !heavy;

	useEffect(() => {
		shown.set(0);
		scale.set(IN.from);
		if (!on) {
			return;
		}
		const delay = reduced ? 0 : READ_ALOUD_AFTER_MS;
		shown.set(
			withDelay(
				delay,
				withTiming(1, { duration: IN.fadeMs, ...PLAY_AS_CHOSEN })
			)
		);
		scale.set(
			reduced
				? 1
				: withDelay(
						delay,
						withTiming(1, { duration: IN.scaleMs, easing: IN.ease })
					)
		);
	}, [landN, on, reduced, shown, scale]);
	const style = useAnimatedStyle(() => ({
		opacity: shown.get(),
		transform: [{ scale: scale.get() }],
	}));

	if (!on) {
		return null;
	}
	const toggle = () => {
		playSoftPress();
		actions.toggleAudio();
	};
	return (
		<Animated.View className="ml-auto" style={style}>
			{audio.playing ? (
				<GlassButton
					accessibilityLabel={COPY.mirror.pause}
					accessibilityRole="button"
					className="h-9 flex-row items-center gap-2 rounded-full px-3"
					onPress={toggle}
				>
					<Icon color={background} name={PAUSE} size={PAUSE_SIZE} />
					<Equaliser className="bg-background" playing />
				</GlassButton>
			) : (
				<PressScale
					accessibilityLabel={COPY.mirror.readAloud}
					accessibilityRole="button"
					className="size-9 items-center justify-center rounded-full bg-accent-wash"
					onPress={toggle}
				>
					<Icon color={accentInk} name={SPEAKER} size={SPEAKER_SIZE} />
				</PressScale>
			)}
		</Animated.View>
	);
}
