import MaskedView from "@react-native-masked-view/masked-view";
import { useEffect, useState } from "react";
import { AccessibilityInfo, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { LinearGradient } from "@/components/shared/styled";
import { EaseView } from "@/design/ease";
import { loopProps, useLoopRun } from "@/design/ease-loops";
import { PLAY_AS_CHOSEN, REDUCED_FADE_MS } from "@/design/springs";
import { useTokenColors } from "@/lib/use-token-color";
import { STAGE_LINE } from "../motion";

const LINE_CLASS = "text-[16px] leading-[22.4px]";
const BAND_WIDTH = 2.6;
const BAND_FROM = -1.6;
const BAND_TO = 0.96;
const BAND_AT = [0, 0.38, 0.5, 0.62, 1] as const;

function Line({ text, className }: { text: string; className?: string }) {
	return (
		<AppText
			center
			className={className ? `${LINE_CLASS} ${className}` : LINE_CLASS}
			variant="callout"
			weight="medium"
		>
			{text}
		</AppText>
	);
}

export function StageLine({
	text,
	running,
	reduced,
}: {
	text: string;
	running: boolean;
	reduced: boolean;
}) {
	const [subtle, foreground] = useTokenColors(["subtle", "foreground"]);
	const [width, setWidth] = useState(0);
	const enter = useSharedValue(reduced ? 1 : 0);
	const sweeping = running && !reduced;
	const run = useLoopRun(sweeping);

	useEffect(() => {
		AccessibilityInfo.announceForAccessibility(text);
		enter.set(0);
		enter.set(
			withTiming(1, {
				duration: reduced ? REDUCED_FADE_MS : STAGE_LINE.ms,
				easing: STAGE_LINE.ease,
				...PLAY_AS_CHOSEN,
			})
		);
	}, [text, enter, reduced]);

	const rise = useAnimatedStyle(() => ({
		opacity: enter.get(),
		transform: [
			{ translateY: reduced ? 0 : STAGE_LINE.rise * (1 - enter.get()) },
		],
	}));
	const soft = useAnimatedStyle(() => ({
		opacity: reduced ? 0 : 1 - enter.get(),
	}));
	const sweep = loopProps({
		easing: "linear",
		from: { translateX: width * BAND_FROM },
		mode: "repeat",
		periodMs: sweeping && width > 0 ? STAGE_LINE.bandMs : 0,
		reduced,
		to: { translateX: width * BAND_TO },
	});

	return (
		<Animated.View
			accessibilityLabel={text}
			accessibilityRole="text"
			accessible
			key={text}
			onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
			style={rise}
		>
			<MaskedView maskElement={<Line text={text} />}>
				<Line className="opacity-0" text={text} />
				<View className="absolute inset-0 bg-subtle" />
				<EaseView
					className="absolute top-0 bottom-0 left-0"
					key={`${run}-${width}`}
					style={{ width: width * BAND_WIDTH }}
					{...sweep}
				>
					<LinearGradient
						className="flex-1"
						colors={[subtle, subtle, foreground, subtle, subtle]}
						end={{ x: 1, y: 0.5 }}
						locations={BAND_AT}
						start={{ x: 0, y: 0.5 }}
					/>
				</EaseView>
			</MaskedView>
			<Animated.View
				className="absolute inset-0"
				pointerEvents="none"
				style={soft}
			>
				<AppText
					center
					className={`${LINE_CLASS} text-subtle/33`}
					color="subtle"
					style={{ textShadowColor: subtle, textShadowRadius: STAGE_LINE.blur }}
					variant="callout"
					weight="medium"
				>
					{text}
				</AppText>
			</Animated.View>
		</Animated.View>
	);
}
