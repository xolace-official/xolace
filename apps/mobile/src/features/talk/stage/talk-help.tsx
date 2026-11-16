import { ScrollView, View } from "react-native";
import Animated, {
	FadeIn,
	FadeOut,
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { TALK_COPY } from "../copy";
import type { TalkGeometry } from "../motion/talk-geometry";
import { LAYOUT } from "../motion/talk-motion";
import type { TalkHelp as Help, TalkScreen } from "../talk-data";
import { HelpResource } from "./help-resource";

const FADE_MS = 300;
const IN = FadeIn.duration(FADE_MS).reduceMotion(PLAY_AS_CHOSEN.reduceMotion);
const OUT = FadeOut.duration(FADE_MS).reduceMotion(PLAY_AS_CHOSEN.reduceMotion);
/** The crisis card keeps this much air above the composer. */
const CARD_GAP = 12;

type Props = {
	help: NonNullable<Help>;
	geo: TalkGeometry;
	/** How far the keyboard lifts the composer: help rides with it. */
	lift: SharedValue<number>;
	onOpen: () => void;
	onResource: TalkScreen["actions"]["openResource"];
};

/**
 * Help on the talk (#599): "Get help now" centred above the composer at elevated, and the
 * people who can help pinned there at crisis. The level is the server's; the companion's
 * crisis line says help is on screen, and this makes that true.
 */
export function TalkHelp({ help, geo, lift, onOpen, onResource }: Props) {
	const ride = useAnimatedStyle(() => ({
		transform: [{ translateY: -lift.get() }],
	}));
	if (help.level === "elevated") {
		return (
			<Animated.View
				className="absolute inset-x-0 items-center"
				entering={IN}
				exiting={OUT}
				pointerEvents="box-none"
				style={[{ top: geo.composerTop - LAYOUT.helpAbove }, ride]}
			>
				<PressScale
					className="h-8.5 justify-center rounded-full border border-separator bg-surface-secondary px-4"
					onPress={onOpen}
				>
					<AppText
						className="text-[14px] leading-[18px]"
						variant="footnote"
						weight="semibold"
					>
						{TALK_COPY.live.help}
					</AppText>
				</PressScale>
			</Animated.View>
		);
	}
	return (
		<Animated.View
			className="absolute inset-x-4"
			entering={IN}
			exiting={OUT}
			style={[{ bottom: geo.height - geo.composerTop + CARD_GAP }, ride]}
		>
			<View
				className="gap-2 rounded-card border border-separator bg-surface p-4"
				style={{ borderCurve: "continuous" }}
			>
				<AppText variant="footnote" weight="semibold">
					{TALK_COPY.live.helpPeople}
				</AppText>
				<ScrollView className="max-h-56" contentContainerClassName="gap-2">
					{help.resources.map((r) => (
						<HelpResource key={r.label} onOpen={onResource} resource={r} />
					))}
				</ScrollView>
				<PressScale className="items-center py-2" onPress={onOpen}>
					<AppText color="accent" variant="footnote" weight="semibold">
						{TALK_COPY.live.helpMore}
					</AppText>
				</PressScale>
			</View>
		</Animated.View>
	);
}
