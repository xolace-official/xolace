import { View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedScrollHandler,
	useSharedValue,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { LOOKS, lookAt } from "../companion-look";
import { TALK_COPY } from "../copy";
import type { TalkGeometry } from "../motion/talk-geometry";
import { LAYOUT } from "../motion/talk-motion";
import type { TalkMotion } from "../motion/use-talk-motion";
import { useTalkScreen } from "../talk-data";
import { LookDots } from "./look-dots";
import { StartGroup } from "./start-group";
import { PaceLine, TalkFacts } from "./talk-facts";
import { VoicePills } from "./voice-pills";

const TITLE = { fontSize: 29, letterSpacing: -0.725, lineHeight: 33 } as const;
const MIN_SPACER = 20;

type Props = {
	geo: TalkGeometry;
	motion: TalkMotion;
	before: boolean;
	face: number;
	index: number;
	orbs: boolean;
	reduced: boolean;
	carTop: SharedValue<number>;
	startTop: SharedValue<number>;
	onDot: (i: number) => void;
	onFit: (overflow: number) => void;
};

export function TalkStart({
	geo,
	motion,
	before,
	face,
	index,
	orbs,
	reduced,
	carTop,
	startTop,
	onDot,
	onFit,
}: Props) {
	const { state, actions } = useTalkScreen();
	const scrollY = useSharedValue(0);
	const carY = useSharedValue(0);
	const startY = useSharedValue(0);
	const onScroll = useAnimatedScrollHandler((e) => {
		scrollY.set(e.contentOffset.y);
		carTop.set(carY.get() - e.contentOffset.y);
		startTop.set(startY.get() - e.contentOffset.y);
	});

	return (
		<Animated.ScrollView
			contentContainerStyle={{
				minHeight: geo.height,
				paddingTop: geo.insets.top + LAYOUT.titleTop,
			}}
			onContentSizeChange={(_, h) => h > geo.height && onFit(h - geo.height)}
			onScroll={onScroll}
			pointerEvents={before ? "auto" : "none"}
			scrollEnabled={before}
			scrollEventThrottle={16}
			showsVerticalScrollIndicator={false}
		>
			<StartGroup enter={0} exit={0} gap={6} motion={motion}>
				<AppText
					accessibilityRole="header"
					center
					className="px-7.5"
					style={TITLE}
					variant="title"
				>
					{TALK_COPY.start.title(state.name)}
				</AppText>
				<AppText center className="px-10" color="muted" variant="callout">
					{TALK_COPY.start.sub}
				</AppText>
			</StartGroup>
			<View
				className="mt-3"
				onLayout={(e) => {
					carY.set(e.nativeEvent.layout.y);
					carTop.set(e.nativeEvent.layout.y - scrollY.get());
				}}
				style={{ height: face + LAYOUT.carouselPad }}
			/>
			<StartGroup enter={1} exit={1} motion={motion}>
				<AppText
					accessibilityElementsHidden
					center
					className="mt-1"
					importantForAccessibility="no"
					variant="callout"
					weight="semibold"
				>
					{LOOKS[lookAt(index)].label}
				</AppText>
				<LookDots index={index} onDot={onDot} />
			</StartGroup>
			<StartGroup enter={2} exit={2} motion={motion}>
				<View className="mt-4">
					<VoicePills
						onPick={actions.pickVoice}
						playing={state.sample}
						reduced={reduced}
						running={orbs}
						voice={state.voice}
					/>
				</View>
			</StartGroup>
			<StartGroup enter={2} exit={3} motion={motion}>
				<View className="mt-3.5">
					<PaceLine onPress={actions.openStyle} state={state} />
				</View>
			</StartGroup>
			<StartGroup enter={3} exit={4} motion={motion}>
				<View className="mt-2.5">
					<TalkFacts name={state.name} week={state.week} />
				</View>
			</StartGroup>
			<View
				className="flex-1"
				onLayout={(e) => onFit(MIN_SPACER - e.nativeEvent.layout.height)}
				style={{ minHeight: MIN_SPACER }}
			/>
			<View
				onLayout={(e) => {
					startY.set(e.nativeEvent.layout.y);
					startTop.set(e.nativeEvent.layout.y - scrollY.get());
				}}
				style={{
					height: LAYOUT.startH + LAYOUT.footGap + LAYOUT.footH,
					marginBottom: geo.insets.bottom + LAYOUT.footBottom,
				}}
			/>
		</Animated.ScrollView>
	);
}
