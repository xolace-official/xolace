import { Pressable, View } from "react-native";
import Animated, { FadeIn, useAnimatedStyle } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { TALK_COPY } from "../copy";
import type { StageFrame } from "../hero/stage-frame";
import type { TalkGeometry } from "../motion/talk-geometry";
import { GO, LAYOUT, seg } from "../motion/talk-motion";
import type { TalkMotion } from "../motion/use-talk-motion";
import { useTalkScreen } from "../talk-data";

const CAPTION_FADE_MS = 260;
const CAPTION_LINES = 4;
const PRESENCE_FADE_MS = 300;
const CAPTION_IN = FadeIn.duration(CAPTION_FADE_MS).reduceMotion(
	PLAY_AS_CHOSEN.reduceMotion
);

type Props = {
	geo: TalkGeometry;
	motion: TalkMotion;
	frame: StageFrame;
	/** The stage's face answers a touch only mid-talk, in the Companion view. */
	touchable: boolean;
	reduced: boolean;
	onSmile: () => void;
	onRelax: () => void;
	onSmileBack: () => void;
};

/**
 * The Companion view around the face (production's stage): the presence word under it, the
 * latest line as a caption, and the face as a button that smiles back. The face itself is
 * the hero (`hero/talk-hero.tsx`), which grew into place. A talk error shows here too, since
 * the transcript that carries it is hidden.
 */
export function TalkStage({
	geo,
	motion,
	frame,
	touchable,
	reduced,
	onSmile,
	onRelax,
	onSmileBack,
}: Props) {
	const { state } = useTalkScreen();
	const latest = state.turns.at(-1);
	const word = useAnimatedStyle(() => ({
		opacity:
			(motion.reduced.get()
				? seg(motion.go.get(), GO.reduced / 2, GO.reduced / 2)
				: seg(motion.go.get(), GO.presenceAt, PRESENCE_FADE_MS)) *
			(1 - motion.toPill.get()) *
			frame.get().presence,
		top: frame.get().presenceTop,
	}));
	const caption = useAnimatedStyle(() => ({ top: frame.get().captionTop }));
	const target = useAnimatedStyle(() => {
		const f = frame.get();
		const size = LAYOUT.stageFace * f.scale;
		return {
			height: size,
			left: geo.width / 2 - size / 2,
			top: f.y - size / 2,
			width: size,
		};
	});

	return (
		<View className="absolute inset-0" pointerEvents="box-none">
			<Animated.View
				className="absolute"
				pointerEvents={touchable ? "auto" : "none"}
				style={target}
			>
				<Pressable
					accessibilityHint={TALK_COPY.live.smiles}
					accessibilityLabel={state.name}
					accessibilityRole="button"
					accessible={touchable}
					className="flex-1"
					onPress={onSmileBack}
					onPressIn={onSmile}
					onPressOut={onRelax}
				/>
			</Animated.View>
			<Animated.View
				className="absolute inset-x-0 items-center"
				pointerEvents="none"
				style={word}
			>
				<AppText
					className="text-[14px] leading-[18px]"
					color="subtle"
					variant="footnote"
				>
					{state.presence}
				</AppText>
			</Animated.View>
			<Animated.View
				className="absolute inset-x-8 gap-1.5"
				pointerEvents="none"
				style={caption}
			>
				{state.error ? (
					<AppText center color="dangerInk" variant="caption">
						{state.error}
					</AppText>
				) : null}
				{latest ? (
					<Animated.View
						className="items-center"
						entering={reduced ? undefined : CAPTION_IN}
						key={latest.id}
					>
						<AppText
							className="mb-1.5"
							color="accent"
							variant="caption"
							weight="semibold"
						>
							{latest.speaker === "person" ? TALK_COPY.live.you : state.name}
						</AppText>
						<AppText
							center
							className="text-[17px] leading-[27px]"
							numberOfLines={CAPTION_LINES}
							variant="body"
						>
							{latest.text || "…"}
						</AppText>
					</Animated.View>
				) : null}
			</Animated.View>
		</View>
	);
}
