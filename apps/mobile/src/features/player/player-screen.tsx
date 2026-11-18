import { StatusBar } from "expo-status-bar";
import { useWindowDimensions, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { CloseButton } from "./chrome/close-button";
import { SleepTimerButton } from "./chrome/sleep-timer-button";
import { useSwipeClose } from "./chrome/use-swipe-close";
import { Transport } from "./controls/transport";
import { VolumeRow } from "./controls/volume-row";
import { usePlayer } from "./player-data";
import { fromCover, P } from "./player-metrics";
import { showsLength } from "./player-model";
import { PlayheadSync } from "./scrub/playhead-sync";
import { ScrubLine } from "./scrub/scrub-line";
import { TimeRow } from "./scrub/time-row";
import { usePlayhead } from "./scrub/use-playhead";
import { Waveform } from "./scrub/waveform";
import { PlayerBackdrop } from "./stage/player-backdrop";
import { PlayerCover } from "./stage/player-cover";
import { PlayerError } from "./stage/player-error";
import { PlayerFoot } from "./stage/player-foot";
import { PlayerHeader } from "./stage/player-header";

/**
 * The player (handoff `player.md`): production's player, every part kept, with the waveform for
 * spoken tracks, glass close and sleep timer, the turning 15 s arcs and a 288 pt cover. Always
 * white on dark. Laid out on the board's 844 pt phone; extra height splits above the cover and
 * below the volume.
 */
export function PlayerScreen() {
	const { state, actions } = usePlayer();
	const insets = useSafeAreaInsets();
	const { height } = useWindowDimensions();
	const reduced = useEffectiveReducedMotion();
	const head = usePlayhead();
	const y = useSharedValue(0);
	const swipe = { close: actions.close, height, reduced, y };
	const swipeTop = useSwipeClose(swipe);
	const swipeFoot = useSwipeClose(swipe);
	const sheet = useAnimatedStyle(() => ({
		transform: [{ translateY: y.get() }],
	}));

	// Free listeners never see the player: the paywall replaces it (the data hook).
	if (state.status === "gated") {
		return <View className="flex-1 bg-player-scrim" />;
	}

	const extra = Math.max(
		0,
		height -
			insets.top -
			insets.bottom -
			(P.boardH - P.boardTopInset - P.boardBottomInset)
	);
	// The board's cover top, under this phone's safe area instead of the board's 50 pt.
	const stageTop = insets.top + P.coverTop - P.boardTopInset + extra / 2;
	const glassTop = insets.top + P.glassTop;
	const { track, status, repeat } = state;
	const failed = status === "error" || status === "gone";
	const duration = track?.durationSec ?? 0;

	return (
		<Animated.View
			accessibilityViewIsModal
			className="flex-1 overflow-hidden bg-player-scrim"
			// VoiceOver can't swipe the player down: the escape gesture closes it, as the chevron does.
			onAccessibilityEscape={actions.close}
			style={sheet}
		>
			<StatusBar hidden={false} style="light" />
			<PlayerBackdrop coverUrl={track?.coverUrl} />

			{/* Swipe down closes from above the scrubber and from the foot; the scrubber, time row,
			    controls and volume keep their own gestures. */}
			<GestureDetector gesture={swipeTop}>
				<View
					className="absolute inset-x-0 top-0"
					style={{ height: stageTop + fromCover(P.waveTop) }}
				/>
			</GestureDetector>
			<GestureDetector gesture={swipeFoot}>
				<View
					className="absolute inset-x-0 bottom-0"
					style={{ top: stageTop + fromCover(P.footTop) - 12 }}
				/>
			</GestureDetector>

			<View
				className="absolute inset-x-0"
				pointerEvents="box-none"
				style={{ height: P.boardH, top: stageTop }}
			>
				{failed ? (
					<PlayerError />
				) : (
					<>
						<PlayheadSync head={head} />
						<PlayerCover head={head} reduced={reduced} />
						<PlayerHeader />
						{track?.peaks ? (
							<Waveform
								duration={duration}
								head={head}
								peaks={track.peaks}
								reduced={reduced}
							/>
						) : (
							<ScrubLine
								disabled={!track}
								duration={duration}
								head={head}
								reduced={reduced}
							/>
						)}
						<TimeRow
							duration={duration}
							head={head}
							showLength={!!track && showsLength(track, repeat)}
						/>
						<Transport reduced={reduced} />
						<VolumeRow />
						<PlayerFoot />
					</>
				)}
			</View>

			<CloseButton top={glassTop} />
			{failed ? null : <SleepTimerButton reduced={reduced} top={glassTop} />}
		</Animated.View>
	);
}
