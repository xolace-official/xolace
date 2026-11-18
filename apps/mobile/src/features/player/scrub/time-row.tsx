import { View } from "react-native";
import Animated, {
	FadeIn,
	FadeOut,
	useAnimatedStyle,
	useDerivedValue,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { PLAYER_COPY } from "../copy";
import { usePlayer } from "../player-data";
import { fmt } from "../player-format";
import { fromCover, P } from "../player-metrics";
import { LiveText } from "./live-text";
import type { Playhead } from "./use-playhead";

/** The times: 12.5 / 16, tabular figures, never scaled (as Music). Both ends are 60 pt wide
 * (`w-15`), so the centre text sits in the middle. */
const TIME = "text-[12.5px] leading-[16px] tabular-nums";
/** A fade either way, so it plays under Reduce Motion too. */
const FADE_MS = 300;
const FADE_IN = FadeIn.duration(FADE_MS).reduceMotion(
	PLAY_AS_CHOSEN.reduceMotion
);
const FADE_OUT = FadeOut.duration(FADE_MS).reduceMotion(
	PLAY_AS_CHOSEN.reduceMotion
);

/** The centre: "Paused by the sleep timer" until the next play. Hidden while scrubbing. */
function Middle({ head }: { head: Playhead }) {
	const { state } = usePlayer();
	const hide = useAnimatedStyle(() => ({ opacity: 1 - head.touch.get() }));
	if (!state.slept) {
		return null;
	}
	return (
		<Animated.View entering={FADE_IN} exiting={FADE_OUT} style={hide}>
			<AppText
				allowFontScaling={false}
				className={`${TIME} text-player-ink/72`}
				variant="caption"
				weight="medium"
			>
				{PLAYER_COPY.sleptBy}
			</AppText>
		</Animated.View>
	);
}

/** Elapsed on the left, time left on the right ("−5:06"); with music on Repeat, the length. */
export function TimeRow({
	head,
	duration,
	showLength,
}: {
	head: Playhead;
	duration: number;
	showLength: boolean;
}) {
	const elapsed = useDerivedValue(() => fmt(head.shown.get() * duration));
	const left = useDerivedValue(
		() => `−${fmt(duration - Math.round(head.shown.get() * duration))}`
	);
	return (
		<View
			className="absolute h-4.5 flex-row items-center justify-between"
			style={{ left: P.side, right: P.side, top: fromCover(P.timeTop) }}
		>
			<LiveText
				className={`${TIME} w-15 font-semibold text-player-ink/72`}
				text={elapsed}
			/>
			<Middle head={head} />
			{showLength ? (
				<AppText
					allowFontScaling={false}
					className={`${TIME} w-15 text-right text-player-ink/50`}
					variant="caption"
					weight="semibold"
				>
					{fmt(duration)}
				</AppText>
			) : (
				<LiveText
					className={`${TIME} w-15 text-right font-semibold text-player-ink/50`}
					text={left}
				/>
			)}
		</View>
	);
}
